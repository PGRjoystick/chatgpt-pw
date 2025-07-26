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

### 1. Install Redis
Set up a Redis server on your system or use a cloud Redis service.

### 2. Update Dependencies
Install the Redis package:
```bash
npm install redis@^4.6.0
```

### 3. Migrate Existing Data
If you have existing conversations in `db.json`, use the migration script to transfer them to Redis.

#### Option A: Simple Migration (Recommended)
```bash
# Run the simple migration script
node simple-migrate.js
```

The script will:
- ✅ Find your `db.json` file automatically
- ✅ Connect to Redis (localhost:6379 by default)
- ✅ Migrate all conversations and API keys
- ✅ Set appropriate expiration times
- ✅ Verify the migration

#### Option B: Advanced Migration
For more control, use the advanced migration script:
```bash
# Dry run to test migration
node migrate-to-redis.js --dry-run

# Actual migration with default settings
node migrate-to-redis.js

# Custom Redis server
node migrate-to-redis.js --redis-host your-redis-server.com --redis-port 6380

# With authentication
node migrate-to-redis.js --redis-password your-password

# Custom JSON file location
node migrate-to-redis.js --json-file /path/to/your/db.json
```

#### Migration Script Options
```bash
# Available options for migrate-to-redis.js
--dry-run                 # Test without writing to Redis
--json-file <path>        # Custom path to db.json
--redis-host <host>       # Redis hostname
--redis-port <port>       # Redis port
--redis-password <pass>   # Redis password
--redis-prefix <prefix>   # Custom key prefix
--batch-size <size>       # Migration batch size
--no-expire              # Don't set expiration on conversations
```

### 4. Configure Your Application
Update your ChatGPT initialization to use Redis:
```javascript
const chatgpt = new ChatGPT("your-api-key", {
  useRedis: true,
  redis: {
    host: "localhost",
    port: 6379,
    keyPrefix: "chatgpt:", // Should match migration prefix
  }
});
```

### 5. Test and Verify
- Test basic chat functionality
- Verify conversations persist between application restarts
- Check Redis for your migrated data:
  ```bash
  redis-cli keys "chatgpt:conversations:*"
  redis-cli keys "chatgpt:keys:*"
  ```

### 6. Backup and Cleanup
- Keep a backup of your original `db.json` file
- After confirming everything works, you can remove the JSON file
- Consider setting up Redis persistence and backups

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
   - Ensure Redis server is running: `redis-cli ping`
   - Check host/port configuration
   - Verify firewall settings

2. **Authentication Failed**
   - Verify password in configuration
   - Check Redis AUTH requirements

3. **Migration Fails**
   - Check JSON file format and permissions
   - Verify Redis has enough memory
   - Use `--dry-run` to test first

4. **High Memory Usage**
   - Monitor conversation expiration
   - Consider reducing expiration time
   - Configure Redis maxmemory policy

### Migration Troubleshooting

#### JSON File Issues
```bash
# Check if db.json exists and is readable
ls -la db.json
cat db.json | jq . # Validate JSON format (requires jq)
```

#### Redis Connection Issues
```bash
# Test Redis connection manually
redis-cli ping
redis-cli info server

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### Data Verification
```bash
# Check migrated data in Redis
redis-cli keys "chatgpt:*"
redis-cli get "chatgpt:conversations:your-conversation-id"

# Monitor Redis memory usage
redis-cli info memory
```

#### Rollback Migration
If you need to rollback to JSON storage:
1. Stop your application
2. Set `useRedis: false` in your configuration
3. Ensure your original `db.json` is in place
4. Restart your application

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
