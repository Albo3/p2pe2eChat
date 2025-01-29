// cache.ts
import type { RedisClientType } from "npm:redis@4.6";

export interface CacheOptions {
    ttl?: number;
    stale?: number;
    tags?: string[];
}

export interface CacheService {
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown, options?: CacheOptions) => Promise<void>;
    invalidate: (key: string) => Promise<void>;
    invalidateByPattern: (pattern: string) => Promise<void>;
    invalidateByTag: (tag: string | string[]) => Promise<void>;
    // Add List operations
    lPush: (key: string, ...values: unknown[]) => Promise<void>;
    lRange: <T>(key: string, start: number, stop: number) => Promise<T[]>;
    lTrim: (key: string, start: number, stop: number) => Promise<void>;
    multi: () => {
        del: (key: string) => any;
        lPush: (key: string, ...values: unknown[]) => any;
        expire: (key: string, seconds: number) => any;
        exec: () => Promise<void>;
    };
    // Sorted Set Operations
    zAdd: (key: string, score: number, member: unknown) => Promise<void>;
    zRange: <T>(key: string, min: number, max: number) => Promise<T[]>;
    zRem: (key: string, member: unknown) => Promise<void>;

    // Hash Operations
    hSet: (key: string, field: string, value: unknown) => Promise<void>;
    hGet: <T>(key: string, field: string) => Promise<T | null>;
    hGetAll: <T>(key: string) => Promise<Record<string, T>>;

    // Set Operations
    sAdd: (key: string, ...members: unknown[]) => Promise<void>;
    sMembers: <T>(key: string) => Promise<T[]>;
    sIsMember: (key: string, member: unknown) => Promise<boolean>;

    // Utility Operations
    scan: (pattern: string) => Promise<string[]>;
    ttl: (key: string) => Promise<number>;
    type: (key: string) => Promise<string>;
    expire: (key: string, seconds: number) => Promise<void>;
    del: (key: string) => Promise<void>;
}

export function createCacheService(redis: RedisClientType): CacheService {
    return {
        async get<T>(key: string): Promise<T | null> {
            try {
                const value = await redis.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Cache get error:', error);
                return null;
            }
        },

        async set(key: string, value: unknown, options?: CacheOptions): Promise<void> {
            try {
                const multi = redis.multi();
                multi.set(key, JSON.stringify(value));

                if (options?.ttl) {
                    multi.expire(key, options.ttl);
                }

                await multi.exec();
            } catch (error) {
                console.error('Cache set error:', error);
                throw error;
            }
        },

        async invalidate(key: string): Promise<void> {
            try {
                await this.del(key);
            } catch (error) {
                console.error('Cache invalidate error:', error);
                throw error;
            }
        },

        async invalidateByPattern(pattern: string): Promise<void> {
            try {
                const keys = await redis.keys(pattern);
                if (keys.length) {
                    await redis.del(keys);
                }
            } catch (error) {
                console.error('Cache invalidateByPattern error:', error);
                throw error;
            }
        },

        async invalidateByTag(tag: string | string[]): Promise<void> {
            const tags = Array.isArray(tag) ? tag : [tag];
            try {
                for (const t of tags) {
                    const keys = await redis.keys(`*${t}*`);
                    if (keys.length) {
                        await redis.del(keys);
                    }
                }
            } catch (error) {
                console.error('Cache invalidateByTag error:', error);
                throw error;
            }
        },

        // Add List operations
        async lPush(key: string, ...values: unknown[]): Promise<void> {
            try {
                await redis.lPush(key, values.map(v => JSON.stringify(v)));
            } catch (error) {
                console.error('Cache lPush error:', error);
                throw error;
            }
        },

        async lRange<T>(key: string, start: number, stop: number): Promise<T[]> {
            try {
                const items = await redis.lRange(key, start, stop);
                return items.map(item => JSON.parse(item)) as T[];
            } catch (error) {
                console.error('Cache lRange error:', error);
                return [];
            }
        },

        async lTrim(key: string, start: number, stop: number): Promise<void> {
            try {
                await redis.lTrim(key, start, stop);
            } catch (error) {
                console.error('Cache lTrim error:', error);
                throw error;
            }
        },

        multi() {
            const pipeline = redis.multi();
            return {
                del: (key: string) => {
                    pipeline.del(key);
                    return pipeline;
                },
                lPush: (key: string, ...values: unknown[]) => {
                    pipeline.lPush(key, values.map(v => JSON.stringify(v)));
                    return pipeline;
                },
                expire: (key: string, seconds: number) => {
                    pipeline.expire(key, seconds);
                    return pipeline;
                },
                exec: () => pipeline.exec()
            };
        },

        // Sorted Set Operations
        async zAdd(key: string, score: number, member: unknown): Promise<void> {
            try {
                await redis.zAdd(key, score, JSON.stringify(member));
            } catch (error) {
                console.error('Cache zAdd error:', error);
                throw error;
            }
        },

        async zRange<T>(key: string, min: number, max: number): Promise<T[]> {
            try {
                const items = await redis.zRange(key, min, max);
                return items.map(item => JSON.parse(item)) as T[];
            } catch (error) {
                console.error('Cache zRange error:', error);
                return [];
            }
        },

        async zRem(key: string, member: unknown): Promise<void> {
            try {
                await redis.zRem(key, JSON.stringify(member));
            } catch (error) {
                console.error('Cache zRem error:', error);
                throw error;
            }
        },

        // Hash Operations
        async hSet(key: string, field: string, value: unknown): Promise<void> {
            try {
                await redis.hSet(key, field, JSON.stringify(value));
            } catch (error) {
                console.error('Cache hSet error:', error);
                throw error;
            }
        },

        async hGet<T>(key: string, field: string): Promise<T | null> {
            try {
                const value = await redis.hGet(key, field);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Cache hGet error:', error);
                return null;
            }
        },

        async hGetAll<T>(key: string): Promise<Record<string, T>> {
            try {
                const values = await redis.hGetAll(key);
                const result: Record<string, T> = {};
                for (const field in values) {
                    result[field] = JSON.parse(values[field]);
                }
                return result;
            } catch (error) {
                console.error('Cache hGetAll error:', error);
                return {};
            }
        },

        // Set Operations
        async sAdd(key: string, ...members: unknown[]): Promise<void> {
            try {
                await redis.sAdd(key, members.map(m => JSON.stringify(m)));
            } catch (error) {
                console.error('Cache sAdd error:', error);
                throw error;
            }
        },

        async sMembers<T>(key: string): Promise<T[]> {
            try {
                const members = await redis.sMembers(key);
                return members.map(member => JSON.parse(member)) as T[];
            } catch (error) {
                console.error('Cache sMembers error:', error);
                return [];
            }
        },

        async sIsMember(key: string, member: unknown): Promise<boolean> {
            try {
                return await redis.sIsMember(key, JSON.stringify(member));
            } catch (error) {
                console.error('Cache sIsMember error:', error);
                return false;
            }
        },

        // Utility Operations
        async scan(pattern: string): Promise<string[]> {
            try {
                return await redis.scan(pattern);
            } catch (error) {
                console.error('Cache scan error:', error);
                return [];
            }
        },

        async ttl(key: string): Promise<number> {
            try {
                return await redis.ttl(key);
            } catch (error) {
                console.error('Cache ttl error:', error);
                return 0;
            }
        },

        async type(key: string): Promise<string> {
            try {
                return await redis.type(key);
            } catch (error) {
                console.error('Cache type error:', error);
                return '';
            }
        },

        async expire(key: string, seconds: number): Promise<void> {
            try {
                await redis.expire(key, seconds);
            } catch (error) {
                console.error('Cache expire error:', error);
                throw error;
            }
        },

        async del(key: string): Promise<void> {
            try {
                await redis.del(key);
            } catch (error) {
                console.error('Cache del error:', error);
                throw error;
            }
        }
    };
}

// Usage example:
/*
const cache = createCacheService(redis);

// Cache data with tags
await cache.set('users:list', users, {
  ttl: 300,  // 5 minutes
  stale: 60, // 1 minute stale
  tags: ['users']
});

// Get cached data
const users = await cache.get('users:list');

// Invalidate by tag
await cache.invalidateByTag('users');

// Invalidate by pattern
await cache.invalidateByPattern('users:*');
*/