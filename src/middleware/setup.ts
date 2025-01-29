import { Hono } from "npm:hono@4";
import { logger } from "npm:hono/logger";
import { cors } from "npm:hono/cors";
import { cspHeader } from "./csp.ts";
import { scanProtection } from "./security.ts";
import { simpleCsrf } from "./simple-csrf.ts";
import { getCookie, setCookie } from "npm:hono/cookie";

export function setupMiddleware(app: Hono) {
    // Add cookie middleware early in the chain
    app.use("*", async (c, next) => {
        // Initialize cookie handling
        await next();
    });

    // Add logging middleware
    app.use("*", logger());

    // Add Content Security Policy
    app.use("*", cspHeader({
        directives: {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://unpkg.com"
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com"
            ],
            'img-src': ["'self'", "data:"],
            'connect-src': [
                "'self'",
                "wss://*.peerjs.com",
                "https://*.peerjs.com"
            ],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'frame-src': ["'none'"]
        }
    }));

    // Add CORS middleware
    app.use("*", cors({
        origin: Deno.env.get('CORS_ORIGIN') || "http://localhost:3000",
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
        exposeHeaders: ['Content-Length', 'X-Requested-With']
    }));

    // Add security scan protection
    app.use("*", scanProtection);

    // Add CSRF protection
    app.use("*", simpleCsrf());

    return app;
} 