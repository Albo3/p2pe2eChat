# Redis Implementation Guide

## Setup & Connection
Our Redis implementation runs on redis:7.2-alpine in Docker Swarm with retry logic and error handling.

Environment Variables:
- REDIS_URL: redis://redis:6379
- REDIS_PASSWORD: redispass

Connection Features:
- Automatic retry (5 attempts)
- 5-second delay between retries
- Connection pooling
- Error recovery
- Health monitoring

## Core Services

### 1. Caching System
The cache service provides:

Key Features:
- TTL-based expiration
- Stale-while-revalidate pattern
- Tag-based invalidation
- Bulk operations
- Type-safe generics

Usage Examples:
Basic Cache:
- Get: redis.cache.get<DataType>("key")
- Set: redis.cache.set("key", data, { ttl: 300 })
- Delete: redis.cache.invalidate("key")

Tagged Caching:
- Set with tags: redis.cache.set("key", data, { tags: ["users"] })
- Invalidate by tag: redis.cache.invalidateByTag("users")
- Pattern invalidation: redis.cache.invalidateByPattern("user:*")

Image Caching:
- Get image info: redis.cache.getImageInfo("filename")
- Invalidate image: redis.cache.invalidateImage("filename")
- Includes: size, type, hash, timestamp

### 2. Session Management
Session features:

Options:
- TTL: 24 hours default
- Rolling sessions
- Automatic cleanup
- Tag-based grouping

Operations:
- Create: sessions.create(userId, data)
- Get: sessions.get(sessionId)
- Update: sessions.update(sessionId, data)
- Destroy: sessions.destroy(sessionId)
- Touch: sessions.touch(sessionId)

### 3. Rate Limiting
Rate limit configurations:

Default Limits:
- DEFAULT: 100 requests/minute
- API: 1000 requests/hour
- AUTH: 5 attempts/5 minutes
- STATIC: 1000 requests/minute

Features:
- IP-based tracking
- Route-specific limits
- Custom windows
- Header information
- Graceful degradation

## Health Monitoring

Health Check Data:
- Connection status
- Redis info
- Memory usage
- Client count
- Operation stats

Endpoint: /health
Returns:
- Redis connection status
- System metrics
- Rate limit status
- Cache statistics

## Best Practices

Error Handling:
- Always use try/catch blocks
- Provide fallback values
- Log Redis errors
- Graceful degradation

Performance:
- Use bulk operations
- Implement proper TTLs
- Clean up expired data
- Monitor memory usage

Security:
- Sanitize keys
- Validate data types
- Use proper ACLs
- Monitor access patterns

## Common Patterns

API Caching:
1. Check cache first
2. Return if found
3. Fetch fresh data if missing
4. Cache with appropriate TTL
5. Include invalidation tags

Session Flow:
1. Create on login
2. Verify on each request
3. Update as needed
4. Cleanup on logout
5. Handle expiration

Rate Limiting:
1. Check client limits
2. Update counters
3. Set appropriate headers
4. Return 429 if exceeded
5. Log abuse patterns

## Debugging Tips


Monitoring Commands:
- INFO: General Redis status
- CLIENT LIST: Connected clients
- MONITOR: Real-time commands
- MEMORY DOCTOR: Memory analysis


Environment:
- Docker Swarm
- Traefik network
- Redis 7.2-alpine
- Deno 2.1.4
