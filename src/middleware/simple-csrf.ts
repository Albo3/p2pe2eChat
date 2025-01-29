import { createMiddleware } from "npm:hono@4";
import { getCookie } from "npm:hono@4/cookie";

export const simpleCsrf = () => {
    return async (c: Context, next: Next) => {
        if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
            const origin = c.req.header('origin');
            if (origin && !origin.includes('localhost')) {
                return c.json({ error: 'Cross-origin requests disabled' }, 403);
            }
        }
        await next();
    };
}; 