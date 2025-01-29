import { load } from "https://deno.land/std@0.215.0/dotenv/mod.ts";

// Update the loadEnvFile function to handle paths better
async function loadEnvFile() {
  const possiblePaths = [
    "./src/.env",
    "./.env",
    "../.env",
    "/deno/app/src/.env"
  ];

  for (const path of possiblePaths) {
    try {
      const config = await load({
        envPath: path,
        export: true,
        allowEmptyValues: true
      });
      console.log(`✓ Loaded environment variables from ${path}`);

      // Manually set env vars since export: true might not work as expected
      for (const [key, value] of Object.entries(config)) {
        if (value) Deno.env.set(key, value);
      }

      return config;
    } catch (error) {
      console.log(`× Failed to load .env from ${path}: ${error.message}`);
    }
  }

  throw new Error("Could not find .env file in any location");
}

// Load environment variables
try {
  await loadEnvFile();
} catch (error) {
  console.error("Failed to load environment variables:", error);
  Deno.exit(1);
}

// Add this after loading env variables
console.log("Stripe Configuration:", {
  webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET")?.substring(0, 10) + "...",
  secretKey: Deno.env.get("STRIPE_SECRET_KEY")?.substring(0, 10) + "...",
  publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY")?.substring(0, 10) + "..."
});

import { Hono } from "npm:hono@4";
import { serveStatic } from "npm:hono/deno";
import { logger } from "npm:hono/logger";
import { cors } from "npm:hono/cors";
import { getCookie, setCookie } from "npm:hono/cookie";
import { createSessionService } from "./services/session.ts";
import { HomePage } from "./components/home-page.ts";
import { initializeRedis } from "./services/redis.ts";
import { createRateLimiter } from "./services/rate-limiter.ts";
import { initializeDb } from "./services/db.ts";
import { initAuthRoutes } from "./services/auth.ts";
import { setupRoutes } from "./services/routes.ts";
import { ChatPage } from "./components/chat.ts";
import { cspHeader } from "./middleware/csp.ts";
import { scanProtection } from "./middleware/security.ts";
import { createSubscriptionService } from "./services/subscription.ts";
import { simpleCsrf } from "./middleware/simple-csrf.ts";
import { setupMiddleware } from "./middleware/setup.ts";
import { createAuthMiddleware } from "./middleware/auth-middleware.ts";
import { UserRepository } from "./repositories/user-repository.ts";
import { createUserService } from "./services/user.ts";
import { createStripeService } from "./services/stripe.ts";

const app = new Hono();

// Setup all middleware
setupMiddleware(app);

// Initialize services
let redis, db;
try {
  // Ensure db directory exists
  try {
    await Deno.mkdir("./db", { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  [redis, db] = await Promise.all([
    initializeRedis(),
    initializeDb("./db/app.db")
  ]);

  console.log('Services initialized successfully');
} catch (error) {
  console.error('Fatal: Service initialization failed:', error);
  Deno.exit(1);
}

const userRepository = new UserRepository(db);
const userService = createUserService(userRepository, redis);
const sessionService = createSessionService(redis);
const stripeService = createStripeService(redis);

// Initialize auth routes FIRST
initAuthRoutes(app, db, sessionService, userRepository, redis);

// Home page
app.get("/", (c) => {
  console.log("Serving home page");
  return c.html(HomePage());
});

// Auth middleware
const authMiddleware = createAuthMiddleware(sessionService);

// Protected chat route
app.get("/chat", authMiddleware, (c) => {
  console.log("Serving chat page");
  return c.html(ChatPage(c));
});

// Setup all other API routes
setupRoutes(app, {
  redis,
  db,
  sessions: sessionService,
  rateLimiter: createRateLimiter(redis, {
    window: '1h',
    max: 1000,
    keyStrategy: 'endpoint'
  }),
  userService,
  sessionService,
  stripeService,
  subscriptionService: createSubscriptionService(db)
});

// Add static file serving
app.use("/static/*", serveStatic({
  root: "./src/",
}));

// Add catch-all 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Update how we access env vars
const port = parseInt(Deno.env.get("PORT") ?? "3000");
const hostname = Deno.env.get("HOST") ?? "0.0.0.0";

// Update environment variable verification
const requiredEnvVars = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_REDIRECT_URI",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "REDIS_URL",
  "REDIS_PASSWORD",
  "COOKIE_DOMAIN"
];

// Add more detailed error reporting
for (const envVar of requiredEnvVars) {
  const value = Deno.env.get(envVar);
  if (!value) {
    console.error(`
Error: ${envVar} is not set in environment variables
Please ensure you have:
1. A valid .env file in the src/ directory
2. The correct environment variable name
3. A non-empty value for the variable
Current search paths:
- ./src/.env
- ./.env
- ../.env
- /deno/app/src/.env
    `);
    Deno.exit(1);
  }
  console.log(`✓ ${envVar} is configured`);
}

Deno.serve({
  port,
  hostname,
  onListen: ({ hostname, port }) => {
    console.log(`
🚀 Server running at http://${hostname}:${port}
📑 Routes available at /health
🔐 Auth routes enabled: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
    `);
  }
}, app.fetch);
