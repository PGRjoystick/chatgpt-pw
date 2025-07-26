# Database Migration Scripts

This directory contains scripts to migrate your ChatGPT conversation data from JSON files to Redis.

## Quick Start

### 1. Simple Migration (Recommended)

For most users, the simple migration script is the easiest option:

```bash
node simple-migrate.js
```

**Before running:**
- Make sure Redis is running (`redis-cli ping`)
- Ensure your `db.json` file is in the same directory
- Update the configuration in the script if needed

### 2. Advanced Migration

For advanced users who need more control:

```bash
# Test the migration first (dry run)
node migrate-to-redis.js --dry-run

# Run the actual migration
node migrate-to-redis.js

# With custom settings
node migrate-to-redis.js --redis-host localhost --redis-port 6379
```

## What Gets Migrated

- **Conversations**: All chat histories with messages, user names, and metadata
- **API Keys**: OpenAI keys with usage statistics (queries, tokens, balance)
- **Expiration**: Conversations automatically expire after 30 days in Redis
- **Structure**: Data structure remains the same for compatibility

## Migration Process

1. **Backup**: Your original `db.json` is not modified
2. **Validation**: Scripts validate JSON format and Redis connectivity
3. **Batch Processing**: Large datasets are processed in batches
4. **Verification**: Migration success is verified after completion

## Configuration

### Simple Script (`simple-migrate.js`)
Edit the configuration object in the script:

```javascript
const config = {
  jsonFile: './db.json',           // Path to your JSON file
  redis: {
    host: 'localhost',             // Redis host
    port: 6379,                    // Redis port
    // password: 'password',       // Uncomment if needed
    keyPrefix: 'chatgpt:',         // Key prefix in Redis
  },
  dryRun: false,                   // Set to true to test
};
```

### Advanced Script (`migrate-to-redis.js`)
Use command-line options:

```bash
--dry-run                 # Test without writing to Redis
--json-file <path>        # Path to JSON file
--redis-host <host>       # Redis hostname
--redis-port <port>       # Redis port number
--redis-password <pass>   # Redis password
--redis-prefix <prefix>   # Key prefix (default: chatgpt:)
--batch-size <size>       # Batch size (default: 100)
--no-expire              # Don't set expiration
--verbose                 # Detailed output
--quiet                   # Minimal output
```

## After Migration

1. **Test Your Application**
   ```javascript
   const chatgpt = new ChatGPT("api-key", {
     useRedis: true,
     redis: { host: "localhost", port: 6379 }
   });
   ```

2. **Verify Data in Redis**
   ```bash
   redis-cli keys "chatgpt:conversations:*"
   redis-cli get "chatgpt:conversations:your-conversation-id"
   ```

3. **Backup Original Data**
   ```bash
   cp db.json db.json.backup
   ```

## Troubleshooting

### Common Issues

1. **"File not found: ./db.json"**
   - Check if `db.json` exists in the current directory
   - Use `--json-file` to specify a different path

2. **"Redis Client Error: connect ECONNREFUSED"**
   - Make sure Redis is running: `redis-cli ping`
   - Check Redis host/port configuration

3. **"Authentication Failed"**
   - Add password to configuration: `--redis-password your-password`

4. **"Migration failed"**
   - Run with `--dry-run` first to identify issues
   - Check Redis memory availability
   - Validate JSON file format

### Getting Help

1. **Check Redis Status**
   ```bash
   redis-cli ping
   redis-cli info server
   ```

2. **Validate JSON File**
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('db.json', 'utf-8')))"
   ```

3. **Test Redis Connection**
   ```bash
   redis-cli set test "hello"
   redis-cli get test
   redis-cli del test
   ```

## Data Structure

### Conversations in Redis
```
Key: chatgpt:conversations:{conversationId}
Value: {"id": "...", "messages": [...], "userName": "...", "lastActive": ...}
TTL: 30 days
```

### API Keys in Redis
```
Key: chatgpt:keys:{apiKey}
Value: {"key": "...", "queries": 0, "tokens": 0, "balance": 0}
TTL: None (persistent)
```

## Security Notes

- Migration scripts only read from JSON files, never modify them
- Redis passwords are not logged or stored
- API keys are truncated in log output for security
- Use Redis AUTH and SSL/TLS in production environments
