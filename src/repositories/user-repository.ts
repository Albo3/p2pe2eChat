import type { DbService } from "../services/db.ts";

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    provider?: "github" | "google";
    provider_id?: string;
    created_at: Date;
    updated_at: Date;
    subscription_tier?: "free" | "basic" | "pro" | "enterprise";
}

export interface UserPreferences {
    theme: string;
    language: string;
}

export interface UserWithPreferences extends User {
    preferences: UserPreferences;
}

export class UserRepository {
    constructor(private readonly db: DbService) { }

    async findById(id: number): Promise<User | null> {
        const stmt = this.db.prepare<User>(`
      SELECT * FROM users 
      WHERE id = ?
    `);
        return stmt.get(id) ?? null;
    }

    async findByUsernameOrEmail(identifier: string): Promise<User | null> {
        const stmt = this.db.prepare<User>(`
      SELECT * FROM users 
      WHERE username = ? OR email = ?
      LIMIT 1
    `);
        const result = stmt.get(identifier, identifier);
        return result ? result : null;
    }

    async createUser(
        user: Pick<User, "username" | "email" | "password_hash"> & {
            provider?: string;
            provider_id?: string;
        }
    ): Promise<number> {
        return this.db.transaction(async () => {
            const stmt = this.db.prepare(`
        INSERT INTO users (
          username, email, password_hash, provider, provider_id
        ) VALUES (?, ?, ?, ?, ?)
      `);

            stmt.run(
                user.username,
                user.email,
                user.password_hash,
                user.provider ?? null,
                user.provider_id ?? null
            );

            return this.db.getLastId();
        });
    }

    async updateUser(
        id: number,
        updates: Partial<Pick<User, "username" | "email" | "password_hash">>
    ): Promise<void> {
        const fields = [];
        const values = [];

        if (updates.username) {
            fields.push("username = ?");
            values.push(updates.username);
        }
        if (updates.email) {
            fields.push("email = ?");
            values.push(updates.email);
        }
        if (updates.password_hash) {
            fields.push("password_hash = ?");
            values.push(updates.password_hash);
        }

        if (fields.length === 0) return;

        const stmt = this.db.prepare(`
      UPDATE users 
      SET ${fields.join(", ")} 
      WHERE id = ?
    `);

        stmt.run(...values, id);
    }

    async getUserWithPreferences(userId: number): Promise<
        User & {
            preferences: UserPreferences;
        }
    > {
        return this.db.transaction(async () => {
            const userStmt = this.db.prepare<User>(`
        SELECT * FROM users WHERE id = ?
      `);
            const prefStmt = this.db.prepare<UserPreferences>(`
        SELECT theme, language FROM user_preferences WHERE user_id = ?
      `);

            const user = userStmt.get(userId);
            const preferences = prefStmt.get(userId);

            if (!user) throw new Error("User not found");

            return {
                ...user,
                preferences: preferences ?? { theme: "dark", language: "en" },
            };
        });
    }

    async listRecent(limit = 10): Promise<User[]> {
        const stmt = this.db.prepare<User>(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
        return stmt.all(limit);
    }

    async findByEmail(email: string): Promise<User | null> {
        const stmt = this.db.prepare<User>(`
      SELECT * FROM users 
      WHERE email = ?
      LIMIT 1
    `);
        return stmt.get(email) ?? null;
    }

    async deleteUser(id: number): Promise<void> {
        const stmt = this.db.prepare(`
      DELETE FROM users 
      WHERE id = ?
    `);
        stmt.run(id);
    }

    async getUserWithSubscription(userId: number): Promise<
        User & {
            subscription_tier: string;
            subscription_expires: Date;
            transaction_count: number;
        }
    > {
        const stmt = this.db.prepare<{
            id: number;
            subscription_tier: string;
            subscription_expires: Date;
            transaction_count: number;
        }>(`
      SELECT 
        u.id,
        u.subscription_tier,
        u.subscription_expires,
        COUNT(t.id) as transaction_count
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `);

        const result = stmt.get(userId);
        if (!result) throw new Error("User not found");

        const baseUser = await this.findById(userId);
        if (!baseUser) throw new Error("User not found");

        return {
            ...baseUser,
            ...result
        };
    }

    async incrementFailedAttempt(userId: number): Promise<void> {
        await this.db.execute(
            `UPDATE users 
             SET failed_attempts = failed_attempts + 1,
                 last_attempt = datetime('now')
             WHERE id = ?`,
            [userId]
        );
    }

    async resetFailedAttempts(userId: number): Promise<void> {
        await this.db.execute(
            `UPDATE users 
             SET failed_attempts = 0 
             WHERE id = ?`,
            [userId]
        );
    }
} 