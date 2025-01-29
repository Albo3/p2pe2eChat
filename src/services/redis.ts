import { createClient, type RedisClientType } from "npm:redis@4.6";
import { createCacheService, type CacheService } from "./cache.ts";

export interface RedisInfo {
    connected: boolean;
    info?: Record<string, string>;
    error?: string;
}

export interface RedisService {
    getHealthStatus: () => Promise<RedisInfo>;
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, options?: { ex?: number }) => Promise<void>;
    incr: (key: string) => Promise<number>;
    del: (...keys: string[]) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<number>;
    cache: CacheService;
}

export interface RedisCache {
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown, options?: CacheOptions) => Promise<void>;
    invalidate: (key: string) => Promise<void>;
    invalidateByPattern: (pattern: string) => Promise<void>;
    invalidateByTag: (tag: string | string[]) => Promise<void>;
    lPush: (key: string, ...values: unknown[]) => Promise<void>;
    lRange: <T>(key: string, start: number, stop: number) => Promise<T[]>;
    lTrim: (key: string, start: number, stop: number) => Promise<void>;
    multi: () => RedisPipeline;
}

interface RedisPipeline {
    del: (key: string) => RedisPipeline;
    lPush: (key: string, ...values: unknown[]) => RedisPipeline;
    expire: (key: string, seconds: number) => RedisPipeline;
    exec: () => Promise<void>;
}

function createRedisService(client: RedisClientType): RedisService {
    const cache = createCacheService(client);

    return {
        async getHealthStatus(): Promise<RedisInfo> {
            try {
                const ping = await client.ping();
                const info = await client.info();

                return {
                    connected: ping === 'PONG',
                    info: info.split('\n')
                        .filter(line => line.includes(':'))
                        .reduce((acc, line) => {
                            const [key, value] = line.split(':');
                            acc[key.trim()] = value.trim();
                            return acc;
                        }, {} as Record<string, string>)
                };
            } catch (error) {
                return {
                    connected: false,
                    error: error.message
                };
            }
        },

        get: client.get.bind(client),
        set: client.set.bind(client),
        incr: client.incr.bind(client),
        del: client.del.bind(client),
        expire: client.expire.bind(client),
        cache
    };
}

function createRedisCache(redis: RedisClientType): RedisCache {
    return {
        get: async <T>(key: string): Promise<T | null> => {
            try {
                const value = await redis.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Redis get error:', error);
                return null;
            }
        },

        set: async (key: string, value: unknown, options?: CacheOptions): Promise<void> => {
            try {
                await redis.set(key, JSON.stringify(value));
            } catch (error) {
                console.error('Redis set error:', error);
                throw error;
            }
        },

        invalidate: async (key: string): Promise<void> => {
            try {
                await redis.del(key);
            } catch (error) {
                console.error('Redis invalidate error:', error);
                throw error;
            }
        },

        invalidateByPattern: async (pattern: string): Promise<void> => {
            try {
                const keys = await redis.keys(pattern);
                await redis.del(keys);
            } catch (error) {
                console.error('Redis invalidateByPattern error:', error);
                throw error;
            }
        },

        invalidateByTag: async (tag: string | string[]): Promise<void> => {
            try {
                const keys = await redis.keys(`*${tag}*`);
                await redis.del(keys);
            } catch (error) {
                console.error('Redis invalidateByTag error:', error);
                throw error;
            }
        },

        lPush: async (key: string, ...values: unknown[]): Promise<void> => {
            try {
                await redis.lPush(key, values.map(v => JSON.stringify(v)));
            } catch (error) {
                console.error('Redis lPush error:', error);
                throw error;
            }
        },

        lRange: async <T>(key: string, start: number, stop: number): Promise<T[]> => {
            try {
                const items = await redis.lRange(key, start, stop);
                return items.map(item => JSON.parse(item)) as T[];
            } catch (error) {
                console.error('Redis lRange error:', error);
                return [];
            }
        },

        lTrim: async (key: string, start: number, stop: number): Promise<void> => {
            try {
                await redis.lTrim(key, start, stop);
            } catch (error) {
                console.error('Redis lTrim error:', error);
                throw error;
            }
        },

        multi: () => {
            const pipeline = redis.multi();
            return {
                del: (key: string) => {
                    pipeline.del(key);
                    return this;
                },
                lPush: (key: string, ...values: unknown[]) => {
                    pipeline.lPush(key, values.map(v => JSON.stringify(v)));
                    return this;
                },
                expire: (key: string, seconds: number) => {
                    pipeline.expire(key, seconds);
                    return this;
                },
                exec: async () => {
                    await pipeline.exec();
                }
            };
        }
    };
}

export async function initializeRedis(
    maxRetries = 5,
    delay = 5000
): Promise<RedisService> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Redis connection attempt ${i + 1}/${maxRetries}`);
            const client = createClient({
                url: Deno.env.get('REDIS_URL') || 'redis://redis:6379',
                password: Deno.env.get('REDIS_PASSWORD') || 'redispass',
            });

            await client.connect();
            console.log('✓ Redis connected');
            return createRedisService(client);
        } catch (error) {
            console.error(`Redis connection failed: ${error.message}`);
            if (i < maxRetries - 1) {
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error('Redis connection failed after multiple attempts');
} 