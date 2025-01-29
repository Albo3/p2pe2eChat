import type { Context } from "npm:hono@4";
import type { Next } from "npm:hono@4";

interface CSPOptions {
    directives: Record<string, string[]>;
}

export function cspHeader(options: CSPOptions) {
    return async (c: Context, next: Next) => {
        // Build CSP header value from directives
        const directives = Object.entries(options.directives)
            .map(([key, values]) => `${key} ${values.join(" ")}`)
            .join("; ");

        // Set CSP header using context's header method
        c.res.headers.set("Content-Security-Policy", directives);

        await next();
    };
} 