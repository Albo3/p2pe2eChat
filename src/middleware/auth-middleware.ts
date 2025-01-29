import { getCookie } from "npm:hono/cookie";
import type { Context, Next } from "npm:hono@4";
import type { SessionService } from "../services/session.ts";

export function createAuthMiddleware(sessionService: SessionService) {
    return async (c: Context, next: Next) => {
        // Allow auth routes without session
        if (c.req.path.startsWith("/api/auth")) {
            return await next();
        }

        try {
            const sid = getCookie(c, "sid");
            if (!sid) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const session = await sessionService.get(sid);
            if (!session) {
                return c.json({ error: "Invalid session" }, 401);
            }

            c.set("session", session);
            await next();
        } catch (error) {
            console.error("Auth error:", error);
            return c.json({ error: "Authentication failed" }, 500);
        }
    };
} 