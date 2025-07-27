import { createClient } from 'redis';

/**
 * Redis Database Inspector
 * Tool to manually inspect and debug your ChatGPT data in Redis
 */

async function inspectRedisDatabase() {
  console.log('🔍 Redis Database Inspector');
  console.log('==========================\n');

  // Configuration - Update if your Redis settings are different
  const config = {
    redis: {
      host: 'localhost',
      port: 6379,
      // password: 'your-redis-password', // Uncomment if needed
      keyPrefix: 'ayana_boat:',
    }
  };

  let client;

  try {
    // Connect to Redis
    console.log('🔌 Connecting to Redis...');
    const redisConfig = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      }
    };

    client = createClient(redisConfig);
    await client.connect();
    console.log('✅ Connected to Redis successfully\n');

    // Get all conversation keys
    console.log('💬 Inspecting Conversations:');
    console.log('============================');
    const conversationKeys = await client.keys(`${config.redis.keyPrefix}conversations:*`);
    console.log(`Found ${conversationKeys.length} conversations\n`);

    // Show first few conversations in detail
    const maxToShow = 3;
    for (let i = 0; i < Math.min(conversationKeys.length, maxToShow); i++) {
      const key = conversationKeys[i];
      const conversationId = key.replace(`${config.redis.keyPrefix}conversations:`, '');
      
      console.log(`📋 Conversation: ${conversationId}`);
      console.log(`   Redis Key: ${key}`);
      
      // Get the data
      const data = await client.get(key);
      const conversation = JSON.parse(data);
      
      console.log(`   User: ${conversation.userName}`);
      console.log(`   Messages: ${conversation.messages?.length || 0}`);
      console.log(`   Last Active: ${conversation.lastActive ? new Date(conversation.lastActive).toLocaleString() : 'N/A'}`);
      
      // Show TTL (time to live)
      const ttl = await client.ttl(key);
      if (ttl > 0) {
        const days = Math.floor(ttl / (24 * 60 * 60));
        console.log(`   Expires in: ${days} days`);
      } else {
        console.log(`   Expires: Never`);
      }
      
      // Show sample messages
      if (conversation.messages && conversation.messages.length > 0) {
        console.log(`   Recent messages:`);
        const recentMessages = conversation.messages.slice(-2); // Last 2 messages
        recentMessages.forEach((msg, idx) => {
          const content = typeof msg.content === 'string' 
            ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
            : '[Complex content]';
          const type = msg.type === 1 ? 'User' : 'Assistant';
          console.log(`     ${idx + 1}. [${type}] ${content}`);
        });
      }
      console.log('');
    }

    if (conversationKeys.length > maxToShow) {
      console.log(`... and ${conversationKeys.length - maxToShow} more conversations\n`);
    }

    // Get all API keys
    console.log('🔑 Inspecting API Keys:');
    console.log('=======================');
    const apiKeyKeys = await client.keys(`${config.redis.keyPrefix}keys:*`);
    console.log(`Found ${apiKeyKeys.length} API keys\n`);

    for (const key of apiKeyKeys) {
      const data = await client.get(key);
      const apiKey = JSON.parse(data);
      
      console.log(`🔐 API Key: ${apiKey.key.substring(0, 10)}...`);
      console.log(`   Redis Key: ${key}`);
      console.log(`   Queries: ${apiKey.queries.toLocaleString()}`);
      console.log(`   Tokens: ${apiKey.tokens.toLocaleString()}`);
      console.log(`   Balance: $${apiKey.balance.toFixed(2)}`);
      console.log('');
    }

    // Show Redis info
    console.log('📊 Redis Database Info:');
    console.log('========================');
    const info = await client.info('memory');
    const memoryLines = info.split('\n').filter(line => 
      line.includes('used_memory_human') || 
      line.includes('used_memory_peak_human') ||
      line.includes('maxmemory_human')
    );
    memoryLines.forEach(line => {
      if (line.trim()) {
        const [key, value] = line.split(':');
        console.log(`   ${key}: ${value}`);
      }
    });

    // Count total keys
    const allKeys = await client.keys(`${config.redis.keyPrefix}*`);
    console.log(`   Total keys with prefix: ${allKeys.length}`);

  } catch (error) {
    console.error('❌ Error inspecting Redis:', error.message);
  } finally {
    if (client) {
      await client.disconnect();
      console.log('\n👋 Disconnected from Redis');
    }
  }
}

// Additional utility functions
async function searchConversation(conversationId) {
  console.log(`🔍 Searching for conversation: ${conversationId}\n`);
  
  const client = createClient({
    socket: { host: 'localhost', port: 6379 }
  });
  
  try {
    await client.connect();
    
    const key = `ayana_boat:conversations:${conversationId}`;
    const data = await client.get(key);
    
    if (data) {
      const conversation = JSON.parse(data);
      console.log('✅ Found conversation:');
      console.log(JSON.stringify(conversation, null, 2));
    } else {
      console.log('❌ Conversation not found');
      
      // Try to find similar keys
      const allKeys = await client.keys('ayana_boat:conversations:*');
      const similar = allKeys.filter(k => k.includes(conversationId));
      if (similar.length > 0) {
        console.log('🔍 Similar conversations found:');
        similar.forEach(k => console.log(`   ${k}`));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

// Check if we're running this script directly
const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  if (command === 'search' && args[1]) {
    searchConversation(args[1]);
  } else {
    console.log('Usage:');
    console.log('  node redis-inspector.js              # Full inspection');
    console.log('  node redis-inspector.js search <id>  # Search specific conversation');
  }
} else {
  inspectRedisDatabase().catch(console.error);
}
