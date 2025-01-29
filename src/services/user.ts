import type { RedisService } from "./redis.ts";
import { UserRepository, type User } from "../repositories/user-repository.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export class UserService {
    constructor(
        private readonly repository: UserRepository,
        private readonly redis: RedisService
    ) { }

    async get(userId: string) {
        const cacheKey = `user:${userId}`;
        const cached = await this.redis.cache.get(cacheKey);
        if (cached) return cached;

        const user = await this.repository.getUserWithPreferences(Number(userId));
        await this.redis.cache.set(cacheKey, user, { ttl: 3600 });
        return user;
    }

    async create(username: string, email: string) {
        const cacheKey = `user:${username}`;
        const cached = await this.redis.cache.get(cacheKey);
        if (cached) {
            throw new Error("Username already exists");
        }

        return await this.repository.createUser({
            username,
            email,
            password_hash: "",
            created_at: new Date()
        });
    }

    async update(userId: string, updates: any) {
        // Update user
        if (updates.username || updates.email) {
            await this.repository.updateUser(Number(userId), {
                username: updates.username,
                email: updates.email
            });
        }

        // Update preferences if provided
        if (updates.theme || updates.language) {
            await this.repository.updateUser(Number(userId), {
                theme: updates.theme,
                language: updates.language
            });
        }

        // Invalidate cache
        await this.redis.cache.invalidateByTag(`user:${userId}`);
    }

    async delete(userId: string) {
        // Delete user (cascade will handle preferences)
        await this.repository.deleteUser(Number(userId));

        // Clear cache
        await this.redis.cache.invalidateByTag(`user:${userId}`);
    }

    async getUserWithSubscription(userId: string) {
        const [user] = await this.repository.getUserWithSubscription(Number(userId));
        return user;
    }

    async authenticate(username: string, password: string): Promise<User> {
        const user = await this.repository.findByUsernameOrEmail(username);
        if (!user) throw new Error("Invalid credentials");

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error("Invalid credentials");

        return user;
    }

    async listRecent(limit = 10): Promise<User[]> {
        const cacheKey = 'users:recent:list';
        const cached = await this.redis.cache.lRange(cacheKey, 0, limit - 1);

        if (cached.length) return cached;

        const users = await this.repository.listRecent(limit);
        await this.redis.cache.lPush(cacheKey, users);
        await this.redis.cache.expire(cacheKey, 3600);

        return users;
    }
}

export function createUserService(
    repository: UserRepository,
    redis: RedisService
): UserService {
    return new UserService(repository, redis);
} 