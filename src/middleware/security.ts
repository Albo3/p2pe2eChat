import { createMiddleware } from "npm:hono@4/factory";

export const scanProtection = createMiddleware(async (c, next) => {
    const path = new URL(c.req.url).pathname;

    // Common scan patterns
    const scanPatterns = [
        /wp-includes/i,
        /xmlrpc\.php/i,
        /wp-content/i,
        /wp-admin/i,
        /wordpress/i,
        /.env/i,
        /\.git/i,
        /\.sql/i,
        /\.php$/i
    ];

    // Check if path matches any scan pattern
    if (scanPatterns.some(pattern => pattern.test(path))) {
        console.log(`Blocked scan attempt: ${path}`);
        return c.json({ error: "Not Found" }, 404);
    }

    return next();
}); 