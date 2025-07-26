# Redis Migration Guide

This document explains how to migrate from JSON file storage to Redis for the ChatGPT library.

## Overview

The library now supports both JSON file storage (existing behavior) and Redis storage for conversation history and API key management. Redis provides better performance and concurrency handling for production use cases.

## Configuration

### Basic Redis Setup

```javascript
import ChatGPT from 'chatgpt-official';

// Using Redis (recommended for production)
const chatgpt = new ChatGPT("your-api-key", {
  useRedis: true,
  redis: {
    host: "localhost",
    port: 6379,
    // password: "your-redis-password", // if auth required
    // database: 0, // Redis database number
    keyPrefix: "chatgpt:", // Optional: prefix for all keys
  }
});

// Using Redis with connection URL
const chatgpt = new ChatGPT("your-api-key", {
  useRedis: true,
  redis: {
    url: "redis://localhost:6379"
  }
});
```

### Legacy JSON File Storage

```javascript
// Continue using JSON files (default behavior)
const chatgpt = new ChatGPT("your-api-key", {
  useRedis: false // or simply omit useRedis
});
```

## Redis Configuration Options

```typescript
interface RedisDbContextOptions {
  url?: string;              // Redis connection URL (alternative to host/port)
  host?: string;             // Redis host (default: "localhost")
  port?: number;             // Redis port (default: 6379)
  password?: string;         // Redis password
  database?: number;         // Redis database number
  keyPrefix?: string;        // Prefix for all keys (default: "chatgpt:")
  connectionTimeout?: number; // Connection timeout in ms
  commandTimeout?: number;   // Command timeout in ms
}
```

## Key Differences

### JSON File Storage
- ✅ Simple setup, no external dependencies
- ✅ Data persists in local files
- ❌ Poor performance with concurrent users
- ❌ File locking issues in production
- ❌ Not suitable for distributed deployments

### Redis Storage
- ✅ Excellent performance with concurrent users
- ✅ Suitable for production and distributed deployments
- ✅ Built-in expiration (conversations expire after 30 days)
- ✅ Memory-efficient storage
- ❌ Requires Redis server setup
- ❌ Data is in-memory (configure Redis persistence as needed)

## Migration Steps

1. **Install Redis**: Set up a Redis server
2. **Update Dependencies**: Install redis package
   ```bash
   npm install redis@^4.6.0
   ```
3. **Update Configuration**: Add Redis configuration to your ChatGPT initialization
4. **Test**: Verify Redis connectivity and basic functionality

## Data Structure in Redis

### Conversations
- Key pattern: `{prefix}conversations:{conversationId}`
- Value: JSON string of Conversation object
- Expiration: 30 days

### API Keys
- Key pattern: `{prefix}keys:{apiKey}`
- Value: JSON string of OpenAIKey object
- Expiration: None (persistent)

## Monitoring and Maintenance

### Check Redis Connection
```javascript
// The ChatGPT instance will log connection status
// Check console for "Connected to Redis" message
```

### Redis Memory Usage
```bash
redis-cli info memory
```

### Backup Conversations
```bash
# Create Redis backup
redis-cli --rdb /path/to/backup.rdb
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Redis server is running
   - Check host/port configuration
   - Verify firewall settings

2. **Authentication Failed**
   - Verify password in configuration
   - Check Redis AUTH requirements

3. **High Memory Usage**
   - Monitor conversation expiration
   - Consider reducing expiration time
   - Configure Redis maxmemory policy

### Performance Optimization

1. **Redis Configuration**
   ```
   # redis.conf
   maxmemory 1gb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   ```

2. **Connection Pooling**
   - Redis client automatically handles connection pooling
   - Monitor connection count with `redis-cli info clients`

## Backward Compatibility

The library maintains backward compatibility with existing JSON file storage. The API remains the same regardless of storage backend.

## Future Considerations

- Consider implementing conversation archiving for long-term storage
- Monitor Redis memory usage and implement cleanup strategies
- Consider Redis Cluster for high-availability deployments

## Support

For Redis-related issues:
1. Check Redis server logs
2. Verify network connectivity
3. Review configuration options
4. Monitor Redis performance metrics
