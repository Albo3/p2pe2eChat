Deno 2 + Redis + SQLite Stack Guide (v2.3)

CORE ARCHITECTURE
---------------
Runtime: Deno 2.1.4
Web Framework: Hono v4
Database: SQLite via @db/sqlite@0.12 (JSR)
Cache/Sessions: Redis 7.2
Auth: Cookie-based sessions + OAuth2
Payments: Stripe v14 with webhooks
Security: CSP, CSRF, Rate Limiting
Styling: Tailwind CSS + Shadcn UI

AUTHENTICATION FLOWS
------------------
Password Security:
- 6+ character minimum
- bcrypt@v0.4.1 hashing
- Secure cookie storage with SameSite=Lax

Session Management:
- Redis storage (24h TTL)
- Auto-extension on activity
- Client fingerprinting (IP/User Agent)

OAuth Integration:
- GitHub & Google providers
- State validation
- Automatic username generation

PAYMENT SYSTEM
------------
Stripe Integration:
- Webhook handling for real-time events
- Customer data syncing to Redis
- Subscription management
- Secure payment processing

Supported Payment Events:
- Checkout completion
- Subscription lifecycle
- Invoice processing
- Payment success/failure
- Dispute handling

SECURITY IMPLEMENTATION
---------------------
Content Security Policy:
- Default: self-only sources
- Scripts: self + Tailwind CDN
- Styles: self + Tailwind sources
- Images: self + data URIs
- Connections: self + WebRTC
- Fonts: self only
- Media/Objects: none

Rate Limiting:
- API: 1000 req/hour
- Auth: 11 req/5min
- Default: 100 req/min
- Stripe webhooks: unlimited

DATABASE SCHEMA
-------------
Users Table:
- UUID primary key
- Provider enum (github/google)
- Updated_at timestamp
- Subscription tier enum
- Stripe customer ID

Subscriptions Table:
- User ID foreign key
- Stripe subscription ID
- Status enum
- Current period dates
- Payment method info

Preferences Table:
- Theme/language defaults
- ON DELETE CASCADE constraint

PERFORMANCE OPTIMIZATIONS
----------------------
Caching:
- Redis caching layer (1h TTL)
- Stripe customer data caching
- Session state management
- Rate limit tracking

Database:
- SQLite WAL mode
- 5s busy timeout
- Prepared statements
- Indexed foreign keys

ERROR HANDLING
------------
HTTP Status Codes:
400: Invalid input
401: Unauthenticated
403: CSRF mismatch
429: Rate limited

Response Format:
- success: boolean
- error: string
- details: object (optional)

ENVIRONMENT VARIABLES
-------------------
Required Variables:
- OAuth credentials (GitHub/Google)
- Redis connection details
- Stripe API keys
- Webhook secrets
- Cookie settings
- Application URLs

---
Last Updated: 2024-01-27