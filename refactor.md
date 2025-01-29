src/
├── core/
│   ├── middleware/          # All middleware organized by category
│   │   ├── security/        # Security-related middleware
│   │   │   ├── csp.ts
│   │   │   ├── csrf.ts
│   │   │   └── scan-protection.ts
│   │   ├── auth/            # Authentication middleware
│   │   │   ├── session-validation.ts
│   │   │   └── role-based.ts
│   │   └── utility/         # General-purpose middleware
│   │       ├── logger.ts
│   │       ├── cors.ts
│   │       └── rate-limiter.ts
│   │
│   ├── services/            # Business logic services
│   │   ├── database/
│   │   │   ├── redis.ts
│   │   │   └── sqlite.ts
│   │   ├── session/
│   │   │   ├── service.ts
│   │   │   └── types.ts
│   │   ├── auth/
│   │   │   ├── strategies/
│   │   │   │   ├── local.ts
│   │   │   │   ├── oauth.ts
│   │   │   │   └── index.ts
│   │   │   └── service.ts
│   │   ├── rate-limiting/
│   │   │   ├── service.ts
│   │   │   └── config.ts
│   │   └── subscription/
│   │       ├── service.ts
│   │       └── types.ts
│   │
│   ├── routes/              # Route definitions
│   │   ├── auth/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   ├── sessions/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   ├── users/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   ├── admin/
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   └── health/
│   │       ├── routes.ts
│   │       └── handlers.ts
│   │
│   └── lib/                 # Shared utilities
│       ├── error-handling.ts
│       ├── validation.ts
│       └── response.ts
│
├── components/              # UI components
├── config/                  # Configuration files
└── static/                  # Static assets