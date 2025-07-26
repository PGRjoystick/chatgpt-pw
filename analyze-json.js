import * as fs from 'fs';

console.log('🔍 Analyzing db.json structure...\n');

try {
  const jsonData = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));
  
  console.log('📋 Top-level structure:');
  console.log(`   Keys in JSON: ${Object.keys(jsonData).join(', ')}`);
  
  if (jsonData.conversations) {
    console.log('\n💬 Conversations structure:');
    if (Array.isArray(jsonData.conversations)) {
      console.log(`   Direct array with ${jsonData.conversations.length} items`);
    } else if (jsonData.conversations.rows) {
      console.log(`   DbContext structure with ${jsonData.conversations.rows.length} items in rows`);
      if (jsonData.conversations.rows.length > 0) {
        const sample = jsonData.conversations.rows[0];
        console.log(`   Sample conversation keys: ${Object.keys(sample).join(', ')}`);
      }
    } else {
      console.log('   Unknown structure:', typeof jsonData.conversations);
    }
  }
  
  if (jsonData.keys) {
    console.log('\n🔑 API Keys structure:');
    if (Array.isArray(jsonData.keys)) {
      console.log(`   Direct array with ${jsonData.keys.length} items`);
    } else if (jsonData.keys.rows) {
      console.log(`   DbContext structure with ${jsonData.keys.rows.length} items in rows`);
      if (jsonData.keys.rows.length > 0) {
        const sample = jsonData.keys.rows[0];
        console.log(`   Sample key structure: ${Object.keys(sample).join(', ')}`);
      }
    } else {
      console.log('   Unknown structure:', typeof jsonData.keys);
    }
  }
  
  console.log('\n✅ Analysis complete!');
  
} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
}
