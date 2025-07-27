# ChatGPT Library Tools

This directory contains various tools and test scripts for the ChatGPT library.

## 🛠️ Migration Tools

### `simple-migrate.js`
Simple migration script to transfer data from `db.json` to Redis.

```bash
# Run from the tools directory
cd tools
node simple-migrate.js
```

### `migrate-to-redis.js`
Advanced migration script with more options and command-line arguments.

```bash
# Run from the tools directory
cd tools
node migrate-to-redis.js

# With custom options
node migrate-to-redis.js --json-file ../custom-db.json --key-prefix "mybot:"
```

## 🔍 Debugging Tools

### `redis-inspector.js`
Tool to inspect and debug your Redis database content.

```bash
# Full database inspection
cd tools
node redis-inspector.js

# Search for specific conversation
node redis-inspector.js search "conversation-id"
```

### `analyze-json.js`
Analyzes the structure of your `db.json` file to understand the data format.

```bash
cd tools
node analyze-json.js
```

## 🧪 Test Scripts

### `test-redis-fix.js`
Test script to verify Redis conversation operations work correctly.

```bash
cd tools
node test-redis-fix.js
```

### `test-blacklist.js`
Test script for API key blacklisting functionality (currently empty).

```bash
cd tools
node test-blacklist.js
```

## 📁 File Organization

All tools are designed to work from the `tools/` directory and reference the main project files using relative paths:

- `../db.json` - References the main database file
- `../dist/index.js` - References the built library
- `../package.json` - References the main package configuration

## 🚀 Usage from Main Directory

You can also run tools from the main project directory:

```bash
# From project root
node tools/simple-migrate.js
node tools/redis-inspector.js
node tools/analyze-json.js
node tools/test-redis-fix.js
```

## 📋 Dependencies

Most tools require:
- Node.js with ES modules support
- Redis server running (for Redis-related tools)
- Built project (`npm run build`)

Make sure to install dependencies first:
```bash
npm install
npm run build
```
