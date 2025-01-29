import type { Hono } from "npm:hono@4";
import type { RedisService } from "./redis.ts";
import type { SessionService } from "./session.ts";
import type { RateLimiterService } from "./rate-limiter.ts";
import { RATE_LIMITS } from "./rate-limiter.ts";
import { UserService } from "./user.ts";
import { getCookie, setCookie } from "npm:hono/cookie";
import type { StripeService } from "./stripe.ts";
import type { DbService } from "./db.ts";

export function setupRoutes(
    app: Hono,
    services: {
        rateLimiter: RateLimiterService;
        userService: UserService;
        sessionService: SessionService;
        stripeService: StripeService;
        redis: RedisService;
        db: DbService;
    }
) {
    // Rate limiting middleware
    app.use('/api/*', services.rateLimiter.middleware(RATE_LIMITS.API));

    // Health check route
    app.get("/health", async (c) => {
        const clientIP = c.req.header('x-forwarded-for') ||
            c.req.header('x-real-ip') ||
            'unknown';

        const rateLimitInfo = await services.rateLimiter.isAllowed(clientIP);

        return c.json({
            status: "healthy",
            rateLimit: {
                remaining: rateLimitInfo.remaining,
                reset: rateLimitInfo.reset,
                total: rateLimitInfo.total
            },
            timestamp: new Date().toISOString()
        });
    });

    // ------------------------
    // Auth Endpoints
    // ------------------------
    app.post("/api/auth/register", async (c) => {
        try {
            const { username, email, password } = await c.req.json();
            const user = await services.userService.create(username, email, password);
            return c.json({ success: true, user });
        } catch (error) {
            return handleAuthError(c, error);
        }
    });

    app.post("/api/auth/login", async (c) => {
        try {
            const { username, password } = await c.req.json();
            const user = await services.userService.authenticate(username, password);

            const session = await services.sessionService.create(user.id.toString(), {
                username: user.username
            });

            setAuthCookie(c, session.id);
            return c.json({ success: true, user: safeUser(user) });
        } catch (error) {
            return handleAuthError(c, error);
        }
    });

    app.get("/api/auth/me", async (c) => {
        try {
            const session = await getSession(c);
            const user = await services.userService.get(session.userId);
            return c.json({ success: true, user: safeUser(user) });
        } catch (error) {
            return handleAuthError(c, error);
        }
    });

    app.post("/api/auth/logout", async (c) => {
        try {
            const session = await getSession(c);
            await services.sessionService.destroy(session.id);
            clearAuthCookie(c);
            return c.json({ success: true });
        } catch (error) {
            return handleAuthError(c, error);
        }
    });

    // ------------------------
    // User Management
    // ------------------------
    app.get("/api/users/list", async (c) => {
        try {
            const users = await services.userService.listRecent();
            return c.json({ success: true, users });
        } catch (error) {
            return handleApiError(c, error);
        }
    });

    app.post("/api/users", async (c) => {
        try {
            const { username, email } = await c.req.json();
            const user = await services.userService.create(username, email);
            return c.json({ success: true, user });
        } catch (error) {
            return handleApiError(c, error);
        }
    });

    // ------------------------
    // Stripe Webhook
    // ------------------------
    app.post("/webhook", async (c) => {
        // Verify stripeService is available
        if (!services.stripeService) {
            console.error("Stripe service not initialized");
            return c.json({ error: "Stripe service not available" }, 500);
        }

        const signature = c.req.header("stripe-signature");
        if (!signature) {
            console.error("Missing stripe-signature header");
            return c.json({ error: "Missing stripe-signature" }, 400);
        }

        try {
            // Get raw body without parsing
            const rawBody = await c.req.raw.clone().text();

            // Log webhook details for debugging
            console.log("Webhook received:", {
                signature: signature.substring(0, 10) + "...",
                bodyLength: rawBody.length,
                webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET")?.substring(0, 10) + "...",
                hasStripeService: !!services.stripeService
            });

            await services.stripeService.handleWebhookEvent(rawBody, signature);

            return c.json({ received: true });
        } catch (error) {
            // Enhanced error logging
            console.error("Webhook processing error:", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                signature: signature.substring(0, 10) + "...",
                hasStripeService: !!services.stripeService
            });

            return c.json({
                error: "Webhook error",
                details: error instanceof Error ? error.message : String(error)
            }, 400);
        }
    });

    app.post("/api/create-checkout", async (c) => {
        const session = c.get("session");
        if (!session?.userId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        try {
            const checkoutUrl = await services.stripeService.createCheckoutSession(
                session.userId,
                session.email
            );
            return c.json({ url: checkoutUrl });
        } catch (error) {
            console.error("Checkout error:", error);
            return c.json({ error: "Checkout failed" }, 500);
        }
    });

    // ------------------------
    // Helper Functions
    // ------------------------
    function safeUser(user: any) {
        const { password_hash, ...safeData } = user;
        return safeData;
    }

    async function getSession(c: any) {
        const sid = getCookie(c, "sid");
        if (!sid) throw new Error("Not authenticated");

        const session = await services.sessionService.get(sid);
        if (!session) throw new Error("Invalid session");

        return session;
    }

    function setAuthCookie(c: any, sessionId: string) {
        setCookie(c, "sid", sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            path: "/",
            maxAge: 86400
        });
    }

    function clearAuthCookie(c: any) {
        setCookie(c, "sid", "", {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            path: "/",
            maxAge: -1
        });
    }

    function handleAuthError(c: any, error: Error) {
        console.error("Auth error:", error);
        return c.json({
            success: false,
            error: error.message
        }, 401);
    }

    function handleApiError(c: any, error: Error) {
        console.error("API error:", error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
} 