import { ChatGPT } from '../dist/index.js';

/**
 * Test script to verify Redis conversation operations work correctly
 * This tests the issue where deleted messages weren't reflected in subsequent reads
 */

async function testRedisConversationOperations() {
  console.log('🧪 Testing Redis Conversation Operations');
  console.log('========================================\n');

  // Initialize ChatGPT with Redis
  const chatgpt = new ChatGPT('test-key', {
    useRedis: true,
    redis: {
      host: 'localhost',
      port: 6379,
      keyPrefix: 'test_fix:'
    }
  });

  const testConversationId = 'test-conversation-fix';

  try {
    // Step 1: Create a conversation with messages
    console.log('📝 Step 1: Creating test conversation...');
    let conversation = await chatgpt.getConversation(testConversationId, 'TestUser');
    
    // Add some test messages
    await chatgpt.addAssistantMessages(testConversationId, 'Hello! This is message 1');
    await chatgpt.addAssistantMessages(testConversationId, 'Hello! This is message 2');
    await chatgpt.addAssistantMessages(testConversationId, 'Hello! This is message 3');
    
    // Step 2: Check initial state
    console.log('🔍 Step 2: Checking initial conversation state...');
    let memory = await chatgpt.getFirstAndLastMessage(testConversationId);
    console.log(`   Messages count should be 3`);
    console.log(`   Last message: "${memory?.lastMessage}"`);
    console.log(`   Last message type: ${memory?.lastType}`);
    
    // Step 3: Delete last message
    console.log('\n🗑️  Step 3: Deleting last message...');
    await chatgpt.deleteLastMessage(testConversationId);
    
    // Step 4: Check state immediately after deletion
    console.log('🔍 Step 4: Checking conversation state after deletion...');
    memory = await chatgpt.getFirstAndLastMessage(testConversationId);
    console.log(`   Last message should now be message 2: "${memory?.lastMessage}"`);
    console.log(`   Last message type: ${memory?.lastType}`);
    
    // Step 5: Delete another message
    console.log('\n🗑️  Step 5: Deleting another message...');
    await chatgpt.deleteLastMessage(testConversationId);
    
    // Step 6: Final check
    console.log('🔍 Step 6: Final conversation state check...');
    memory = await chatgpt.getFirstAndLastMessage(testConversationId);
    console.log(`   Last message should now be message 1: "${memory?.lastMessage}"`);
    console.log(`   Last message type: ${memory?.lastType}`);
    
    // Step 7: Test multiple deletions like your regeneration logic
    console.log('\n🔄 Step 7: Testing regeneration-style deletion loop...');
    
    // Add more messages to test the loop
    await chatgpt.addAssistantMessages(testConversationId, 'Assistant message 1');
    await chatgpt.addAssistantMessages(testConversationId, 'Assistant message 2');
    
    // Simulate your regeneration logic
    let loopMemory = await chatgpt.getFirstAndLastMessage(testConversationId);
    let loopCount = 0;
    
    console.log(`   Starting loop. Last message type: ${loopMemory?.lastType}`);
    
    while (loopMemory && loopMemory.lastType === 2 && loopCount < 5) { // 2 = assistant message
      console.log(`   Loop ${loopCount + 1}: Deleting assistant message: "${loopMemory.lastMessage}"`);
      await chatgpt.deleteLastMessage(testConversationId);
      loopMemory = await chatgpt.getFirstAndLastMessage(testConversationId);
      loopCount++;
      
      if (loopMemory) {
        console.log(`   After deletion - Last message: "${loopMemory.lastMessage}", Type: ${loopMemory.lastType}`);
      } else {
        console.log(`   No more messages in conversation`);
        break;
      }
    }
    
    console.log(`\n✅ Test completed! Loop executed ${loopCount} times.`);
    
    if (loopMemory && loopMemory.lastType === 1) {
      console.log('✅ SUCCESS: Final message is a user message (type 1) as expected!');
    } else if (!loopMemory) {
      console.log('ℹ️  INFO: No messages left in conversation');
    } else {
      console.log(`⚠️  WARNING: Final message type is ${loopMemory.lastType}, expected 1 (user message)`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRedisConversationOperations().catch(console.error);
