import type { DbService } from "./db.ts";
import { SUBSCRIPTION_TIERS } from "./db-init.ts";

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface SubscriptionService {
    getCurrentTier(userId: string): Promise<SubscriptionTier>;
    upgradeTier(userId: string, newTier: SubscriptionTier): Promise<void>;
    getBalance(userId: string): Promise<number>;
    addBalance(userId: string, amount: number, description?: string): Promise<number>;
    deductBalance(userId: string, amount: number, description?: string): Promise<number>;
    getTransactionHistory(userId: string, limit?: number): Promise<any[]>;
}

export function createSubscriptionService(db: DbService): SubscriptionService {
    return {
        async getCurrentTier(userId: string) {
            const [user] = await db.query<{ subscription_tier: SubscriptionTier }>(
                "SELECT subscription_tier FROM users WHERE id = ?",
                [userId]
            );
            return user?.subscription_tier || 'free';
        },

        async upgradeTier(userId: string, newTier: SubscriptionTier) {
            return await db.transaction(async () => {
                // Get current tier
                const currentTier = await this.getCurrentTier(userId);

                // Update user's subscription
                await db.execute(
                    `UPDATE users 
                     SET subscription_tier = ?,
                         subscription_expires_at = datetime('now', '+30 days')
                     WHERE id = ?`,
                    [newTier, userId]
                );

                // Record in history
                await db.execute(
                    `INSERT INTO subscription_history (user_id, old_tier, new_tier)
                     VALUES (?, ?, ?)`,
                    [userId, currentTier, newTier]
                );
            });
        },

        async getBalance(userId: string) {
            const [user] = await db.query<{ balance: number }>(
                "SELECT balance FROM users WHERE id = ?",
                [userId]
            );
            return user?.balance || 0;
        },

        async addBalance(userId: string, amount: number, description = 'Deposit') {
            return await db.transaction(async () => {
                // Update balance
                await db.execute(
                    "UPDATE users SET balance = balance + ? WHERE id = ?",
                    [amount, userId]
                );

                // Record transaction
                await db.execute(
                    `INSERT INTO transactions (user_id, amount, type, description)
                     VALUES (?, ?, 'deposit', ?)`,
                    [userId, amount, description]
                );

                return this.getBalance(userId);
            });
        },

        async deductBalance(userId: string, amount: number, description = 'Withdrawal') {
            return await db.transaction(async () => {
                const currentBalance = await this.getBalance(userId);
                if (currentBalance < amount) {
                    throw new Error('Insufficient balance');
                }

                // Update balance
                await db.execute(
                    "UPDATE users SET balance = balance - ? WHERE id = ?",
                    [amount, userId]
                );

                // Record transaction
                await db.execute(
                    `INSERT INTO transactions (user_id, amount, type, description)
                     VALUES (?, ?, 'withdrawal', ?)`,
                    [userId, amount, description]
                );

                return this.getBalance(userId);
            });
        },

        async getTransactionHistory(userId: string, limit = 10) {
            return await db.query(
                `SELECT * FROM transactions 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [userId, limit]
            );
        }
    };
} 