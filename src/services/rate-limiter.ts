// rate-limiter.ts
import type { RedisService } from "./redis.ts";
import type { Context, Next } from "npm:hono@4";

export const RATE_LIMITS = {
    DEFAULT: { maxRequests: 100, windowSeconds: 60 },
    API: { maxRequests: 1000, windowSeconds: 3600 },
    AUTH: { maxRequests: 11, windowSeconds: 300 }, // 
    STATIC: { maxRequests: 1000, windowSeconds: 60 }
} as const;

export interface RateLimitInfo {
    remaining: number;
    reset: number;
    total: number;
}

export interface RateLimitOptions {
    maxRequests: number;
    windowSeconds: number;
    keyPrefix?: string;
}

export interface RateLimiterService {
    isAllowed: (key: string, options?: Partial<RateLimitOptions>) => Promise<RateLimitInfo>;
    middleware: (options?: Partial<RateLimitOptions>) => (c: Context, next: Next) => Promise<void>;
    resetLimit: (key: string) => Promise<void>;
}

interface RateLimiterOptions {
    window: number | string; // Can be seconds or '1h'/'5m' format
    max: number;
    keyPrefix?: string;
    keyStrategy?: 'ip' | 'account' | 'endpoint';
}

export function createRateLimiter(redis: RedisService, options: RateLimiterOptions): RateLimiterService {
    const windowSeconds = typeof options.window === 'string'
        ? parseDuration(options.window)
        : options.window;

    async function isAllowed(
        key: string,
        customOptions: Partial<RateLimitOptions> = {}
    ): Promise<RateLimitInfo> {
        const options = {
            ...RATE_LIMITS.DEFAULT,
            keyPrefix: 'rate:',
            ...customOptions
        };

        const redisKey = `${options.keyPrefix}${key}`;

        try {
            // Get current count and TTL
            const [count, ttl] = await Promise.all([
                redis.get(redisKey),
                redis.ttl(redisKey)
            ]);

            // If key doesn't exist or TTL is -2 (key doesn't exist), start fresh
            if (!count || ttl === -2) {
                await redis.set(redisKey, '1', { ex: options.windowSeconds });
                return {
                    remaining: options.maxRequests - 1,
                    reset: Math.floor(Date.now() / 1000) + options.windowSeconds,
                    total: options.maxRequests
                };
            }

            const currentCount = Number(count);

            // If we've exceeded the limit, return 0 remaining
            if (currentCount >= options.maxRequests) {
                return {
                    remaining: 0,
                    reset: Math.floor(Date.now() / 1000) + (ttl === -1 ? options.windowSeconds : ttl),
                    total: options.maxRequests
                };
            }

            // Increment counter
            await redis.incr(redisKey);

            return {
                remaining: options.maxRequests - currentCount - 1,
                reset: Math.floor(Date.now() / 1000) + (ttl === -1 ? options.windowSeconds : ttl),
                total: options.maxRequests
            };
        } catch (error) {
            console.error('Rate limit error:', error);
            // On error, allow the request but log the error
            return {
                remaining: 1,
                reset: Math.floor(Date.now() / 1000) + options.windowSeconds,
                total: options.maxRequests
            };
        }
    }

    function middleware(customOptions: Partial<RateLimitOptions> = {}) {
        return async function rateLimitMiddleware(c: Context, next: Next) {
            // Get appropriate key based on strategy
            const key = [
                options.keyPrefix || 'rl',
                options.keyStrategy === 'ip' ? c.req.header('x-forwarded-for') || c.req.ip : '',
                options.keyStrategy === 'account' ? c.get('session')?.userId : '',
                options.keyStrategy === 'endpoint' ? c.req.path : ''
            ].filter(Boolean).join(':');

            const current = await redis.get(key);
            const count = current ? parseInt(current) : 0;

            if (count >= options.max) {
                c.header('Retry-After', windowSeconds.toString());
                return c.json({
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Try again in ${windowSeconds} seconds`
                }, 429);
            }

            // Increment and set expiration if new
            await redis.incr(key);
            if (!current) {
                await redis.expire(key, windowSeconds);
            }

            // Set headers
            c.header('X-RateLimit-Limit', options.max.toString());
            c.header('X-RateLimit-Remaining', (options.max - count - 1).toString());
            c.header('X-RateLimit-Reset', (Date.now() + windowSeconds * 1000).toString());

            await next();
        }
    }

    // Add a method to manually reset rate limits
    async function resetLimit(key: string): Promise<void> {
        const redisKey = `rate:${key}`;
        await redis.del(redisKey);
    }

    return {
        isAllowed,
        middleware,
        resetLimit
    };
}

// Helper to convert 1h -> 3600, 5m -> 300 etc
function parseDuration(duration: string): number {
    const units = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid duration format');

    return parseInt(match[1]) * units[match[2] as keyof typeof units];
}

/* Usage in main.ts:

const rateLimiter = createRateLimiter(redis);

// Global rate limiting
app.use('*', rateLimiter.middleware());

// Custom limits for specific routes
app.use('/api/*', rateLimiter.middleware(RATE_LIMITS.API));
app.use('/auth/*', rateLimiter.middleware(RATE_LIMITS.AUTH));

// Custom limits
app.use('/special/*', rateLimiter.middleware({
  maxRequests: 50,
  windowSeconds: 3600
}));

*/