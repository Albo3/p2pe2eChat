// db-init.ts

// Define subscription tiers as a constant
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
} as const;

export const INIT_SCHEMA = [
    // // First, drop existing tables in correct order
    // `DROP TABLE IF EXISTS subscription_history;`,
    // `DROP TABLE IF EXISTS transactions;`,
    // `DROP TABLE IF EXISTS user_preferences;`,
    // `DROP TABLE IF EXISTS users;`,

    // Create users table with new columns
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        provider TEXT,
        provider_id TEXT,
        subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
        failed_attempts INTEGER DEFAULT 0,
        last_attempt DATETIME,
        locked_until DATETIME,
        balance DECIMAL(10,2) DEFAULT 0.00 CHECK(balance >= 0),
        subscription_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_id)
    );`,

    // Create user_preferences table
    `CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        language TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    // Create transaction history table
    `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'subscription_payment')),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    // Create subscription history table
    `CREATE TABLE IF NOT EXISTS subscription_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        old_tier TEXT NOT NULL,
        new_tier TEXT NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    `CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier);`,
    `CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance);`,
    `CREATE INDEX IF NOT EXISTS idx_prefs_theme ON user_preferences(theme);`,
    `CREATE INDEX IF NOT EXISTS idx_prefs_language ON user_preferences(language);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);`,

    // Create triggers
    `CREATE TRIGGER IF NOT EXISTS users_updated_at 
     AFTER UPDATE ON users
     BEGIN
         UPDATE users SET updated_at = CURRENT_TIMESTAMP
         WHERE id = NEW.id;
     END;`,

    `CREATE TRIGGER IF NOT EXISTS preferences_updated_at 
     AFTER UPDATE ON user_preferences
     BEGIN
         UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP
         WHERE user_id = NEW.user_id;
     END;`
];
