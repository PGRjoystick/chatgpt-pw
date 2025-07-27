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
  throw new Error('db.json file not found. Please ensure db.json exists in the current directory or parent directory.');
}

/**
 * Simple migration script for ChatGPT database
 * This script will migrate your db.json to Redis
 */

async function migrateToRedis() {
  console.log('🚀 ChatGPT Database Migration Tool');
  console.log('==================================\n');

  // Configuration - Update these values for your setup
  const config = {
    // Path to your existing db.json file
    jsonFile: findDbJsonPath(),
    
    // Redis connection settings
    redis: {
      host: 'localhost',
      port: 6379,
      // password: 'your-redis-password', // Uncomment if Redis requires auth
      // database: 0, // Uncomment to use specific Redis database
      keyPrefix: 'ayana_boat:',
    },
    
    // Migration settings
    dryRun: false, // Set to true to test without actually writing to Redis
  };

  let client;

  try {
    // Step 1: Check if JSON file exists
    console.log('📁 Checking for JSON database...');
    if (!fs.existsSync(config.jsonFile)) {
      console.error(`❌ File not found: ${config.jsonFile}`);
      console.log('Please make sure your db.json file exists in the current directory.');
      return;
    }

    // Step 2: Load and parse JSON data
    console.log('📖 Loading JSON database...');
    const jsonData = JSON.parse(fs.readFileSync(config.jsonFile, 'utf-8'));
    
    // Handle both direct arrays and DbContext structure
    let conversations = [];
    let keys = [];
    
    if (jsonData.conversations) {
      if (Array.isArray(jsonData.conversations)) {
        conversations = jsonData.conversations;
      } else if (jsonData.conversations.rows && Array.isArray(jsonData.conversations.rows)) {
        conversations = jsonData.conversations.rows;
      }
    }
    
    if (jsonData.keys) {
      if (Array.isArray(jsonData.keys)) {
        keys = jsonData.keys;
      } else if (jsonData.keys.rows && Array.isArray(jsonData.keys.rows)) {
        keys = jsonData.keys.rows;
      }
    }
    
    console.log(`   Found ${conversations.length} conversations`);
    console.log(`   Found ${keys.length} API keys`);

    if (conversations.length === 0 && keys.length === 0) {
      console.log('⚠️  No data found to migrate. Exiting.');
      return;
    }

    // Step 3: Connect to Redis
    console.log('\n🔌 Connecting to Redis...');
    const redisConfig = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      }
    };
    
    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }
    
    if (config.redis.database) {
      redisConfig.database = config.redis.database;
    }

    client = createClient(redisConfig);
    
    client.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    await client.connect();
    console.log('✅ Connected to Redis successfully');

    // Check for existing data
    const existingConversations = await client.keys(`${config.redis.keyPrefix}conversations:*`);
    const existingKeys = await client.keys(`${config.redis.keyPrefix}keys:*`);
    
    if (existingConversations.length > 0 || existingKeys.length > 0) {
      console.log(`\n⚠️  Found existing data in Redis:`);
      console.log(`   ${existingConversations.length} conversations`);
      console.log(`   ${existingKeys.length} API keys`);
      console.log(`   This migration will add/update data, potentially overwriting existing entries.`);
    }

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No data will be written to Redis\n');
    }

    // Step 4: Migrate conversations
    if (conversations.length > 0) {
      console.log(`\n💬 Migrating ${conversations.length} conversations...`);
      
      for (const conversation of conversations) {
        const key = `${config.redis.keyPrefix}conversations:${conversation.id}`;
        const value = JSON.stringify(conversation);
        
        if (!config.dryRun) {
          await client.set(key, value);
          // Set expiration to 30 days
          await client.expire(key, 30 * 24 * 60 * 60);
        }
        
        console.log(`   ✓ ${conversation.id} (${conversation.messages?.length || 0} messages)`);
      }
      
      console.log(`✅ Migrated ${conversations.length} conversations`);
    }

    // Step 5: Migrate API keys
    if (keys.length > 0) {
      console.log(`\n🔑 Migrating ${keys.length} API keys...`);
      
      for (const apiKey of keys) {
        const key = `${config.redis.keyPrefix}keys:${apiKey.key}`;
        const value = JSON.stringify(apiKey);
        
        if (!config.dryRun) {
          await client.set(key, value);
        }
        
        console.log(`   ✓ ${apiKey.key.substring(0, 10)}... (${apiKey.queries} queries, ${apiKey.tokens} tokens)`);
      }
      
      console.log(`✅ Migrated ${keys.length} API keys`);
    }

    // Step 6: Verify migration
    if (!config.dryRun) {
      console.log('\n🔍 Verifying migration...');
      
      const conversationKeys = await client.keys(`${config.redis.keyPrefix}conversations:*`);
      const apiKeyKeys = await client.keys(`${config.redis.keyPrefix}keys:*`);
      
      console.log(`   Found ${conversationKeys.length} conversations in Redis`);
      console.log(`   Found ${apiKeyKeys.length} API keys in Redis`);
      
      // Test reading one conversation
      if (conversationKeys.length > 0) {
        const testData = await client.get(conversationKeys[0]);
        const testConversation = JSON.parse(testData);
        if (testConversation.id && testConversation.messages) {
          console.log('   ✓ Data structure verification passed');
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    
    if (!config.dryRun) {
      console.log('\n📋 Next steps:');
      console.log('1. Update your ChatGPT configuration to use Redis:');
      console.log(`   const chatgpt = new ChatGPT("api-key", {`);
      console.log(`     useRedis: true,`);
      console.log(`     redis: {`);
      console.log(`       host: "${config.redis.host}",`);
      console.log(`       port: ${config.redis.port},`);
      console.log(`       keyPrefix: "${config.redis.keyPrefix}",`);
      console.log(`     }`);
      console.log(`   });`);
      console.log('2. Test your application with Redis storage');
      console.log('3. Backup your db.json file');
      console.log('4. Optionally remove db.json after confirming everything works');
    } else {
      console.log('\n📋 This was a dry run. To perform the actual migration:');
      console.log('1. Set config.dryRun = false in this script');
      console.log('2. Run the script again');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.disconnect();
      console.log('\n👋 Disconnected from Redis');
    }
  }
}

// Run the migration
migrateToRedis().catch(console.error);
