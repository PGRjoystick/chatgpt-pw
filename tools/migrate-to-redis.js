#!/usr/bin/env node

/**
 * Migration script to transfer data from db.json to Redis
 * Usage: node migrate-to-redis.js [options]
 */

import { createClient } from 'redis';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to find db.json file
function findDbJsonPath() {
  const possiblePaths = ['./db.json', '../db.json'];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return './db.json'; // fallback to current directory
}

// Configuration
const DEFAULT_CONFIG = {
  // Source file
  jsonFilePath: findDbJsonPath(),
  
  // Redis configuration
  redis: {
    host: 'localhost',
    port: 6379,
    // password: 'your-redis-password',
    // database: 0,
    keyPrefix: 'chatgpt:',
  },
  
  // Migration options
  dryRun: false,
  verbose: true,
  batchSize: 100,
  expireConversations: true,
  conversationTTL: 30 * 24 * 60 * 60, // 30 days in seconds
};

class DatabaseMigration {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = null;
    this.stats = {
      conversationsMigrated: 0,
      keysMigrated: 0,
      errors: 0,
      warnings: 0,
    };
  }

  async connect() {
    try {
      const redisConfig = {};
      
      if (this.config.redis.url) {
        redisConfig.url = this.config.redis.url;
      } else {
        redisConfig.socket = {
          host: this.config.redis.host || 'localhost',
          port: this.config.redis.port || 6379,
        };
        if (this.config.redis.password) {
          redisConfig.password = this.config.redis.password;
        }
      }
      
      if (this.config.redis.database) {
        redisConfig.database = this.config.redis.database;
      }

      this.client = createClient(redisConfig);
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.client.connect();
      console.log('✅ Connected to Redis successfully');
      
      // Test connection
      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis ping test failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      console.log('✅ Disconnected from Redis');
    }
  }

  loadJsonData() {
    try {
      if (!fs.existsSync(this.config.jsonFilePath)) {
        throw new Error(`JSON file not found: ${this.config.jsonFilePath}`);
      }

      const jsonData = fs.readFileSync(this.config.jsonFilePath, 'utf-8');
      const data = JSON.parse(jsonData);

      if (this.config.verbose) {
        console.log(`📁 Loaded JSON data from: ${this.config.jsonFilePath}`);
        console.log(`📊 Found ${data.conversations?.length || 0} conversations`);
        console.log(`🔑 Found ${data.keys?.length || 0} API keys`);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to load JSON data:', error.message);
      throw error;
    }
  }

  async migrateConversations(conversations) {
    if (!conversations || !Array.isArray(conversations)) {
      console.log('⚠️  No conversations found to migrate');
      return;
    }

    console.log(`🔄 Starting migration of ${conversations.length} conversations...`);

    for (let i = 0; i < conversations.length; i += this.config.batchSize) {
      const batch = conversations.slice(i, i + this.config.batchSize);
      await this.processBatch(batch, 'conversation');
    }

    console.log(`✅ Completed conversation migration: ${this.stats.conversationsMigrated} migrated`);
  }

  async migrateApiKeys(keys) {
    if (!keys || !Array.isArray(keys)) {
      console.log('⚠️  No API keys found to migrate');
      return;
    }

    console.log(`🔄 Starting migration of ${keys.length} API keys...`);

    for (let i = 0; i < keys.length; i += this.config.batchSize) {
      const batch = keys.slice(i, i + this.config.batchSize);
      await this.processBatch(batch, 'key');
    }

    console.log(`✅ Completed API key migration: ${this.stats.keysMigrated} migrated`);
  }

  async processBatch(batch, type) {
    const pipeline = this.client.multi();

    for (const item of batch) {
      try {
        if (type === 'conversation') {
          await this.addConversationToPipeline(pipeline, item);
        } else if (type === 'key') {
          await this.addKeyToPipeline(pipeline, item);
        }
      } catch (error) {
        console.error(`❌ Error processing ${type}:`, error.message);
        this.stats.errors++;
      }
    }

    if (!this.config.dryRun && pipeline.length > 0) {
      try {
        await pipeline.exec();
      } catch (error) {
        console.error('❌ Batch execution failed:', error.message);
        this.stats.errors++;
      }
    }
  }

  async addConversationToPipeline(pipeline, conversation) {
    if (!conversation.id) {
      console.warn('⚠️  Skipping conversation without ID');
      this.stats.warnings++;
      return;
    }

    const key = `${this.config.redis.keyPrefix}conversations:${conversation.id}`;
    const value = JSON.stringify(conversation);

    if (this.config.verbose) {
      console.log(`📝 ${this.config.dryRun ? '[DRY RUN] ' : ''}Migrating conversation: ${conversation.id}`);
    }

    if (!this.config.dryRun) {
      pipeline.set(key, value);
      
      if (this.config.expireConversations) {
        pipeline.expire(key, this.config.conversationTTL);
      }
    }

    this.stats.conversationsMigrated++;
  }

  async addKeyToPipeline(pipeline, apiKey) {
    if (!apiKey.key) {
      console.warn('⚠️  Skipping API key without key value');
      this.stats.warnings++;
      return;
    }

    const key = `${this.config.redis.keyPrefix}keys:${apiKey.key}`;
    const value = JSON.stringify(apiKey);

    if (this.config.verbose) {
      console.log(`🔑 ${this.config.dryRun ? '[DRY RUN] ' : ''}Migrating API key: ${apiKey.key.substring(0, 10)}...`);
    }

    if (!this.config.dryRun) {
      pipeline.set(key, value);
    }

    this.stats.keysMigrated++;
  }

  async validateMigration() {
    if (this.config.dryRun) {
      console.log('⚠️  Skipping validation for dry run');
      return;
    }

    console.log('🔍 Validating migration...');

    try {
      // Check some sample keys
      const conversationKeys = await this.client.keys(`${this.config.redis.keyPrefix}conversations:*`);
      const apiKeyKeys = await this.client.keys(`${this.config.redis.keyPrefix}keys:*`);

      console.log(`✅ Found ${conversationKeys.length} conversation keys in Redis`);
      console.log(`✅ Found ${apiKeyKeys.length} API key keys in Redis`);

      // Test reading a sample conversation
      if (conversationKeys.length > 0) {
        const sampleKey = conversationKeys[0];
        const sampleValue = await this.client.get(sampleKey);
        const sampleConversation = JSON.parse(sampleValue);
        
        if (sampleConversation.id && sampleConversation.messages) {
          console.log('✅ Sample conversation structure validated');
        } else {
          console.warn('⚠️  Sample conversation structure may be invalid');
        }
      }

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.stats.errors++;
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('================================');
    console.log(`Conversations migrated: ${this.stats.conversationsMigrated}`);
    console.log(`API keys migrated: ${this.stats.keysMigrated}`);
    console.log(`Warnings: ${this.stats.warnings}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    
    if (this.stats.errors > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the logs.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  }

  async run() {
    try {
      console.log('🚀 Starting database migration from JSON to Redis...\n');
      
      if (this.config.dryRun) {
        console.log('🔍 Running in DRY RUN mode - no data will be written to Redis\n');
      }

      // Connect to Redis
      await this.connect();

      // Load JSON data
      const jsonData = this.loadJsonData();

      // Migrate conversations
      if (jsonData.conversations) {
        await this.migrateConversations(jsonData.conversations);
      }

      // Migrate API keys
      if (jsonData.keys) {
        await this.migrateApiKeys(jsonData.keys);
      }

      // Validate migration
      await this.validateMigration();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--quiet':
        config.verbose = false;
        break;
      case '--json-file':
        config.jsonFilePath = args[++i];
        break;
      case '--redis-host':
        config.redis.host = args[++i];
        break;
      case '--redis-port':
        config.redis.port = parseInt(args[++i]);
        break;
      case '--redis-password':
        config.redis.password = args[++i];
        break;
      case '--redis-db':
        config.redis.database = parseInt(args[++i]);
        break;
      case '--redis-prefix':
        config.redis.keyPrefix = args[++i];
        break;
      case '--batch-size':
        config.batchSize = parseInt(args[++i]);
        break;
      case '--no-expire':
        config.expireConversations = false;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return config;
}

function printHelp() {
  console.log(`
ChatGPT Database Migration Tool
==============================

Usage: node migrate-to-redis.js [options]

Options:
  --dry-run                 Run without writing to Redis (default: false)
  --verbose                 Verbose output (default: true)
  --quiet                   Minimal output
  --json-file <path>        Path to db.json file (default: ../db.json)
  --redis-host <host>       Redis host (default: localhost)
  --redis-port <port>       Redis port (default: 6379)
  --redis-password <pass>   Redis password
  --redis-db <num>          Redis database number (default: 0)
  --redis-prefix <prefix>   Key prefix (default: chatgpt:)
  --batch-size <size>       Batch size for migration (default: 100)
  --no-expire               Don't set expiration on conversations
  --help                    Show this help

Examples:
  # Dry run to test migration
  node migrate-to-redis.js --dry-run

  # Migrate with custom Redis settings
  node migrate-to-redis.js --redis-host redis.example.com --redis-port 6380

  # Migrate with authentication
  node migrate-to-redis.js --redis-password mypassword

  # Custom JSON file location
  node migrate-to-redis.js --json-file /path/to/custom-db.json
`);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs();
  const migration = new DatabaseMigration(config);
  migration.run().catch(console.error);
}

export default DatabaseMigration;
