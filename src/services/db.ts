import { Database } from "@db/sqlite";
import { INIT_SCHEMA } from "./db-init.ts";

export interface DbService {
    query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
    execute: (sql: string, params?: unknown[]) => Promise<void>;
    transaction: <T>(operations: () => Promise<T>) => Promise<T>;
    getLastId: () => number;
    close: () => void;
    prepare: <T>(sql: string) => {
        get: (...params: unknown[]) => T | undefined;
        all: (...params: unknown[]) => T[];
        run: (...params: unknown[]) => void;
    };
}

export async function initializeDb(dbPath = "./db/app.db"): Promise<DbService> {
    try {
        // Ensure db directory exists
        try {
            await Deno.mkdir("./db", { recursive: true });
        } catch (error) {
            if (!(error instanceof Deno.errors.AlreadyExists)) {
                throw error;
            }
        }

        const db = new Database(dbPath, {
            mode: 'rwc'  // Read, write, create if not exists
        });

        // Set pragmas using prepare
        const pragmas = [
            "PRAGMA journal_mode = WAL",
            "PRAGMA busy_timeout = 5000",
            "PRAGMA foreign_keys = ON",
            "PRAGMA synchronous = NORMAL",
            "PRAGMA cache_size = -2000"
        ];

        for (const pragma of pragmas) {
            db.prepare(pragma).run();
        }

        console.log('✓ SQLite connected to:', dbPath);

        // Initialize schema - execute each statement separately
        for (const query of INIT_SCHEMA) {
            try {
                db.prepare(query).run();
            } catch (error) {
                console.error('Schema initialization error:', error);
                throw error;
            }
        }

        const service: DbService = {
            async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
                try {
                    const stmt = db.prepare(sql);
                    return stmt.all<T>(...params);
                } catch (error) {
                    console.error('Query error:', error);
                    throw error;
                }
            },

            async execute(sql: string, params: unknown[] = []): Promise<void> {
                try {
                    const stmt = db.prepare(sql);
                    stmt.run(...params);
                } catch (error) {
                    console.error('Execute error:', error);
                    throw error;
                }
            },

            async transaction<T>(operations: () => Promise<T>): Promise<T> {
                const beginStmt = db.prepare('BEGIN IMMEDIATE');
                try {
                    beginStmt.run();
                    const result = await operations();
                    db.prepare('COMMIT').run();
                    return result;
                } catch (error) {
                    db.prepare('ROLLBACK').run();
                    throw error;
                }
            },

            getLastId(): number {
                return db.lastInsertRowId;
            },

            close(): void {
                db.close();
            },

            prepare: <T>(sql: string) => {
                return {
                    get: (...params: unknown[]) => {
                        const stmt = db.prepare(sql);
                        return stmt.get<T>(...params);
                    },
                    all: (...params: unknown[]) => {
                        const stmt = db.prepare(sql);
                        return stmt.all<T>(...params);
                    },
                    run: (...params: unknown[]) => {
                        const stmt = db.prepare(sql);
                        stmt.run(...params);
                    }
                };
            }
        };

        return service;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Example usage:
/*
const db = await initializeDb();

// Create user
await db.execute(
    "INSERT INTO users (username, email) VALUES (?, ?)",
    ["john_doe", "john@example.com"]
);

// Query users
const users = await db.query(
    "SELECT * FROM users WHERE username = ?",
    ["john_doe"]
);

// Update preferences
await db.execute(
    "INSERT INTO user_preferences (user_id, theme) VALUES (?, ?)",
    [1, "dark"]
);
*/