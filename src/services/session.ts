import type { RedisService } from "./redis.ts";
import { v4 as uuid } from "npm:uuid@9.0.0";
import { crypto } from "https://deno.land/std@0.215.0/crypto/mod.ts";

export interface SessionData extends Record<string, unknown> {
    ip?: string;
    userAgent?: string;
    createdAt?: number;
}

export interface Session {
    id: string;
    userId: string;
    data: SessionData;
    createdAt: number;
    expiresAt: number;
}

export interface SessionOptions {
    ttl?: number; // Session duration in seconds (default: 24 hours)
    rolling?: boolean; // Reset expiration on access (default: true)
}

export interface SessionService {
    create: (userId: string, data?: Record<string, unknown>) => Promise<{ id: string }>;
    get: (sessionId: string) => Promise<Record<string, unknown> | null>;
    destroy: (sessionId: string) => Promise<void>;
    generateState: () => Promise<string>;
    verifyState: (state: string) => Promise<boolean>;
}

const DEFAULT_OPTIONS: Required<SessionOptions> = {
    ttl: 24 * 60 * 60, // 24 hours
    rolling: true,
};

function generateSessionId(): string {
    return crypto.randomUUID();
}

export class SessionManager implements SessionService {
    private readonly SESSION_TTL = 24 * 60 * 60; // 24 hours
    private readonly STATE_TTL = 10 * 60; // 10 minutes

    constructor(private readonly redis: RedisService) { }

    async create(userId: string, data: Record<string, unknown> = {}): Promise<{ id: string }> {
        const sessionId = uuid();
        const sessionData = {
            userId,
            ...data,
            created: Date.now()
        };

        await this.redis.cache.set(`session:${sessionId}`, sessionData, {
            ttl: this.SESSION_TTL
        });

        return { id: sessionId };
    }

    async get(sessionId: string): Promise<Record<string, unknown> | null> {
        const data = await this.redis.cache.get(`session:${sessionId}`);
        if (!data) return null;

        // Extend session TTL on access
        await this.redis.cache.expire(`session:${sessionId}`, this.SESSION_TTL);
        return data;
    }

    async destroy(sessionId: string): Promise<void> {
        await this.redis.cache.del(`session:${sessionId}`);
    }

    async generateState(): Promise<string> {
        const state = uuid();
        await this.redis.cache.set(`oauth_state:${state}`, true, {
            ttl: this.STATE_TTL
        });
        return state;
    }

    async verifyState(state: string): Promise<boolean> {
        const key = `oauth_state:${state}`;
        const isValid = await this.redis.cache.get(key);
        if (isValid) {
            await this.redis.cache.del(key);
            return true;
        }
        return false;
    }
}

export function createSessionService(redis: RedisService): SessionService {
    return new SessionManager(redis);
}

// Usage example:
/*
const sessions = createSessionService(redis, {
  ttl: 30 * 60, // 30 minutes
  rolling: true,
});

// Create a session
const session = await sessions.create('user123', {
  role: 'admin',
  theme: 'dark'
});

// Get session
const userSession = await sessions.get(session.id);

// Update session data
await sessions.update(session.id, {
  lastAction: 'profile_update'
});

// Destroy session (logout)
await sessions.destroy(session.id);

// Middleware example
async function sessionMiddleware(c: Context, next: Next) {
  const sessionId = c.req.cookie('sessionId');
  if (!sessionId) return c.redirect('/login');

  const session = await sessions.get(sessionId);
  if (!session) return c.redirect('/login');

  c.set('session', session);
  await next();
}
*/ 