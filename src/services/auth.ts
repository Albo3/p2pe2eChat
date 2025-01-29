// auth.ts
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
import { Hono } from "npm:hono@4"
import type { Context, Next } from "npm:hono@4"
import { getCookie, setCookie } from "npm:hono/cookie"
import { OAuth2Client } from "npm:google-auth-library@9.6.3"
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.2.3"

import type { SessionService } from "./session.ts"
import type { DbService } from "./db.ts"
import { createAuthMiddleware } from "../middleware/auth-middleware.ts"
import { UserRepository, type User } from "../repositories/user-repository.ts"
import { createRateLimiter } from "./rate-limiter.ts"
import { RedisService } from "../services/redis.ts"

// Replace the complex PASSWORD_REGEX with a simple minimum length check
const MIN_PASSWORD_LENGTH = 6;

interface OAuthConfig {
    github: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
}

export function initAuthRoutes(
    app: Hono,
    db: DbService,
    sessionService: SessionService,
    userRepository: UserRepository,
    redis: RedisService
) {
    const auth = new Hono()

    // Session middleware
    auth.use("*", createAuthMiddleware(sessionService))

    // Register
    auth.post("/register",
        createRateLimiter(redis, {
            window: '1h',
            max: 5,
            keyStrategy: 'ip',
            keyPrefix: 'auth:register'
        }).middleware(),
        async (c) => {
            try {
                const { username, email, password } = await c.req.json()

                if (!username || !email || !password) {
                    return c.json({
                        error: "Missing fields",
                        details: {
                            username: !username ? "Username is required" : null,
                            email: !email ? "Email is required" : null,
                            password: !password ? "Password is required" : null
                        }
                    }, 400)
                }

                // Check if user exists
                const existing = await userRepository.findByUsernameOrEmail(username);
                if (existing) {
                    return c.json({ error: "User already exists" }, 409)
                }

                // Simple password length check
                if (password.length < MIN_PASSWORD_LENGTH) {
                    return c.json({
                        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
                    }, 400)
                }

                // Hash password
                const passwordHash = await bcrypt.hash(password)

                // Insert user
                let userId
                await db.transaction(async () => {
                    const result = await db.execute(
                        `INSERT INTO users (username, email, password_hash, created_at)
                         VALUES (?, ?, ?, datetime('now'))`,
                        [username, email, passwordHash]
                    )
                    userId = db.getLastId()
                })

                // Create session immediately after registration
                const session = await sessionService.create(String(userId), {
                    username: username
                })

                // Set session cookie
                setCookie(c, "sid", session.id, {
                    httpOnly: true,
                    secure: c.req.secure,
                    sameSite: "Lax",
                    path: "/",
                    maxAge: 86400,
                    domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
                })

                return c.json({
                    success: true,
                    message: "Registration successful",
                    user: {
                        username,
                        email
                    }
                })
            } catch (error) {
                console.error("Registration error:", error)
                return c.json({
                    error: "Registration failed",
                    details: error.message
                }, 500)
            }
        }
    )

    // Login
    auth.post("/login",
        createRateLimiter(redis, {
            window: '5m',
            max: 11,
            keyStrategy: 'ip',
            keyPrefix: 'auth:login:ip'
        }).middleware(),
        createRateLimiter(redis, {
            window: '1h',
            max: 30,
            keyStrategy: 'account',
            keyPrefix: 'auth:login:account'
        }).middleware(),
        async (c) => {
            try {
                const { username, password } = await c.req.json()
                console.log('Login attempt for:', username) // Debug log

                if (!username || !password) {
                    return c.json({
                        error: "Missing credentials",
                        details: {
                            username: !username ? "Username is required" : null,
                            password: !password ? "Password is required" : null
                        }
                    }, 400)
                }

                // Fetch user - check both username and email
                const user = await userRepository.findByUsernameOrEmail(username);
                if (!user) {
                    console.log('User not found:', username) // Debug log
                    return c.json({ error: "Invalid credentials" }, 401)
                }

                // Verify password
                const valid = await bcrypt.compare(password, user.password_hash)
                if (valid) {
                    // Reset rate limits for this IP and account
                    await Promise.all([
                        redis.del(`auth:login:ip:${c.req.ip}`),
                        redis.del(`auth:login:account:${user.id}`)
                    ]);

                    // Create session with request info
                    const session = await sessionService.create(String(user.id), {
                        username: user.username,
                        ip: c.req.header('x-forwarded-for') || 'unknown',
                        userAgent: c.req.header('user-agent') || 'unknown'
                    })

                    // Set cookie
                    setCookie(c, "sid", session.id, {
                        httpOnly: true,
                        secure: c.req.secure,
                        sameSite: "Lax",
                        path: "/",
                        maxAge: 86400,
                        domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
                    })

                    console.log('Login successful for:', username) // Debug log

                    return c.json({
                        success: true,
                        message: "Login successful",
                        user: {
                            username: user.username,
                            email: user.email
                        }
                    })
                } else {
                    // Track failed attempts
                    await userRepository.incrementFailedAttempt(user.id);

                    console.log('Invalid password for:', username) // Debug log
                    return c.json({ error: "Invalid credentials" }, 401)
                }
            } catch (error) {
                console.error("Login error:", error)
                return c.json({
                    error: "Login failed",
                    details: error.message
                }, 500)
            }
        }
    )

    // Get current user
    auth.get("/me", async (c) => {
        const session = c.get("session");
        const sid = getCookie(c, "sid");

        if (!sid) {
            return c.json({
                success: false,
                authenticated: false
            });
        }

        try {
            const sessionData = await sessionService.get(sid);
            if (!sessionData) {
                return c.json({
                    success: false,
                    authenticated: false
                });
            }

            const [user] = await db.query<User>(
                `SELECT id, username, email, created_at, provider
                 FROM users WHERE id = ?`,
                [sessionData.userId]
            );

            if (!user) {
                return c.json({
                    success: false,
                    authenticated: false,
                    error: "User not found"
                });
            }

            return c.json({
                success: true,
                authenticated: true,
                sessionData: {
                    username: user.username
                },
                user: {
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at,
                    provider: user.provider
                }
            });
        } catch (error) {
            console.error("Profile error:", error);
            return c.json({
                success: false,
                error: "Failed to fetch profile",
                details: error.message
            }, 500);
        }
    });

    // Logout
    auth.post("/logout", async (c) => {
        try {
            const sid = getCookie(c, "sid");
            console.log('Logout attempt - Session ID:', sid);

            if (sid) {
                await sessionService.destroy(sid);
            }

            // Always clear cookies, even if session wasn't found
            setCookie(c, "sid", "", {
                maxAge: 0,
                path: "/",
                httpOnly: true,
                secure: c.req.secure,
                sameSite: "Lax",
                domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
            });

            setCookie(c, "csrf_token", "", {
                maxAge: 0,
                path: "/",
                httpOnly: true,
                secure: c.req.secure,
                sameSite: "Lax",
                domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
            });

            return c.json({
                success: true,
                message: "Logged out successfully"
            });
        } catch (error) {
            console.error('Logout error:', error);
            return c.json({
                error: "Logout failed",
                details: error.message
            }, 500);
        }
    });

    // Change password
    auth.post("/change-password", async (c) => {
        const session = c.get("session");
        if (!session) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        try {
            const { currentPassword, newPassword } = await c.req.json();

            if (!currentPassword || !newPassword) {
                return c.json({ error: "Missing password fields" }, 400);
            }

            // Get user
            const rows = await db.query<User>(
                `SELECT id, username, password_hash
                 FROM users WHERE id = ?`,
                [session.userId]
            );

            const user = rows[0];
            if (!user) {
                return c.json({ error: "User not found" }, 404);
            }

            // Verify current password
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) {
                return c.json({ error: "Current password is incorrect" }, 401);
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword);

            // Update password
            await db.execute(
                `UPDATE users SET password_hash = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [newPasswordHash, user.id]
            );

            return c.json({
                success: true,
                message: "Password updated successfully"
            });
        } catch (error) {
            console.error("Password change error:", error);
            return c.json({
                error: "Failed to update password",
                details: error.message
            }, 500);
        }
    });

    // GitHub OAuth login
    auth.get("/github", async (c) => {
        const clientId = Deno.env.get("GITHUB_CLIENT_ID");
        const redirectUri = Deno.env.get("GITHUB_REDIRECT_URI");

        if (!clientId || !redirectUri) {
            console.error("Missing GitHub OAuth configuration:", { clientId: !!clientId, redirectUri: !!redirectUri });
            return c.json({ error: "OAuth configuration error" }, 500);
        }

        try {
            const state = await sessionService.generateState();
            const params = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: "user:email",
                state: state
            });

            const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
            console.log("Redirecting to GitHub:", githubAuthUrl);

            return c.redirect(githubAuthUrl);
        } catch (error) {
            console.error("GitHub OAuth initialization error:", error);
            return c.json({ error: "Failed to initialize OAuth flow" }, 500);
        }
    });

    // GitHub OAuth callback
    auth.get("/github/callback", async (c) => {
        console.log("GitHub OAuth callback received", {
            code: !!c.req.query("code"),
            state: c.req.query("state"),
            url: c.req.url
        });

        const code = c.req.query("code");
        const state = c.req.query("state");

        if (!code || !state || !await sessionService.verifyState(state)) {
            return c.json({ error: "Invalid OAuth state" }, 400);
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: Deno.env.get("GITHUB_CLIENT_ID"),
                    client_secret: Deno.env.get("GITHUB_CLIENT_SECRET"),
                    code,
                    redirect_uri: Deno.env.get("GITHUB_REDIRECT_URI"),
                }),
            });

            const { access_token } = await tokenResponse.json();

            // Get user data
            const userResponse = await fetch("https://api.github.com/user", {
                headers: {
                    "Authorization": `Bearer ${access_token}`,
                },
            });

            const githubUser = await userResponse.json();

            // Get user's email
            const emailsResponse = await fetch("https://api.github.com/user/emails", {
                headers: {
                    "Authorization": `Bearer ${access_token}`,
                },
            });

            const emails = await emailsResponse.json();
            const primaryEmail = emails.find((email: any) => email.primary)?.email;

            // Create or update user with unique username
            let userId: number;
            await db.transaction(async () => {
                // First check if user exists by email
                const existingUser = await userRepository.findByEmail(primaryEmail);

                if (existingUser) {
                    userId = existingUser.id;
                } else {
                    // Generate unique username
                    let baseUsername = githubUser.login;
                    let username = baseUsername;
                    let counter = 1;

                    // Keep checking until we find an available username
                    while (true) {
                        const [userExists] = await db.query<{ count: number }>(
                            "SELECT COUNT(*) as count FROM users WHERE username = ?",
                            [username]
                        );

                        if (userExists.count === 0) {
                            break;
                        }

                        // Try next number
                        username = `${baseUsername}${counter}`;
                        counter++;

                        // Prevent infinite loops
                        if (counter > 100) {
                            throw new Error("Could not generate unique username");
                        }
                    }

                    // Insert new user with unique username
                    await db.execute(
                        `INSERT INTO users (
                            username, 
                            email, 
                            password_hash,
                            provider,
                            provider_id
                        ) VALUES (?, ?, ?, ?, ?)`,
                        [
                            username,
                            primaryEmail,
                            "GITHUB_OAUTH_USER",
                            "github",
                            githubUser.id.toString()
                        ]
                    );
                    userId = db.getLastId();

                    console.log("Created new GitHub user:", {
                        username,
                        email: primaryEmail,
                        githubId: githubUser.id
                    });
                }
            });

            // Create session with the actual username from the database
            const [user] = await db.query<User>(
                "SELECT username FROM users WHERE id = ?",
                [userId]
            );

            const session = await sessionService.create(String(userId), {
                username: user.username, // Use the actual username from our database
                provider: "github",
                ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
                userAgent: c.req.header('user-agent') || 'unknown'
            });

            // Set session cookie
            setCookie(c, "sid", session.id, {
                httpOnly: true,
                secure: c.req.secure,
                sameSite: "Lax",
                path: "/",
                maxAge: 86400,
                domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
            })

            // Redirect back to home page with success parameter
            return c.redirect("/?auth=success");
        } catch (error) {
            console.error("GitHub OAuth error:", error);
            return c.redirect("/?error=oauth_failed");
        }
    });

    // Google OAuth login
    auth.get("/google", async (c) => {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            new URLSearchParams({
                client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
                redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI") || "",
                response_type: "code",
                scope: "email profile",
                state: await sessionService.generateState()
            });

        return c.redirect(googleAuthUrl);
    });

    // Google OAuth callback
    auth.get("/google/callback", async (c) => {
        const code = c.req.query("code");
        const state = c.req.query("state");

        if (!code || !state || !await sessionService.verifyState(state)) {
            return c.json({ error: "Invalid OAuth state" }, 400);
        }

        try {
            const oauth2Client = new OAuth2Client({
                clientId: Deno.env.get("GOOGLE_CLIENT_ID"),
                clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
                redirectUri: Deno.env.get("GOOGLE_REDIRECT_URI"),
            });

            const { tokens } = await oauth2Client.getToken(code);
            const ticket = await oauth2Client.verifyIdToken({
                idToken: tokens.id_token!,
                audience: Deno.env.get("GOOGLE_CLIENT_ID"),
            });

            const payload = ticket.getPayload()!;

            // Create or update user
            let userId: number;
            await db.transaction(async () => {
                const [existingUser] = await db.query<User>(
                    "SELECT id FROM users WHERE email = ?",
                    [payload.email]
                );

                if (existingUser) {
                    userId = existingUser.id;
                } else {
                    await db.execute(
                        `INSERT INTO users (username, email, password_hash)
                         VALUES (?, ?, ?)`,
                        [payload.name, payload.email, "GOOGLE_OAUTH_USER"]
                    );
                    userId = db.getLastId();
                }
            });

            // Create session with additional data
            const session = await sessionService.create(String(userId), {
                username: payload.name,
                provider: "google",
                ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
                userAgent: c.req.header('user-agent') || 'unknown'
            });

            // Set session cookie
            setCookie(c, "sid", session.id, {
                httpOnly: true,
                secure: c.req.secure,
                sameSite: "Lax",
                path: "/",
                maxAge: 86400,
                domain: Deno.env.get('COOKIE_DOMAIN') || "localhost"
            })

            // Redirect back to home page with success parameter
            return c.redirect("/?auth=success");
        } catch (error) {
            console.error("Google OAuth error:", error);
            return c.redirect("/?error=oauth_failed");
        }
    });

    // Mount auth routes under /api/auth
    app.route("/api/auth", auth)

    // Log mounted routes
    console.log('Auth routes mounted:', auth.routes)

    // Add this near the start of initAuthRoutes
    console.log('OAuth Configuration:', {
        github: {
            clientId: Deno.env.get("GITHUB_CLIENT_ID")?.slice(0, 8) + "...",
            redirectUri: Deno.env.get("GITHUB_REDIRECT_URI"),
        },
        google: {
            clientId: Deno.env.get("GOOGLE_CLIENT_ID")?.slice(0, 8) + "...",
            redirectUri: Deno.env.get("GOOGLE_REDIRECT_URI"),
        }
    });
}
