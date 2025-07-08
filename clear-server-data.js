#!/usr/bin/env node

const AWS = require('aws-sdk');
require('dotenv').config();

// AWS Configuration
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Database table names
const TABLES = {
  USERS: 'goalaroo-users',
  MAGIC_CODES: 'goalaroo-magic-codes',
  USER_DATA: 'goalaroo-user-data'
};

async function clearAllData() {
  console.log('🚀 Starting server data cleanup...');
  
  try {
    // Clear magic codes
    console.log('🗑️ Clearing magic codes...');
    const magicCodesResult = await dynamodb.scan({
      TableName: TABLES.MAGIC_CODES
    }).promise();
    
    for (const item of magicCodesResult.Items) {
      await dynamodb.delete({
        TableName: TABLES.MAGIC_CODES,
        Key: { email: item.email }
      }).promise();
    }
    console.log(`✅ Cleared ${magicCodesResult.Items.length} magic codes`);
    
    // Clear user data
    console.log('🗑️ Clearing user data...');
    const userDataResult = await dynamodb.scan({
      TableName: TABLES.USER_DATA
    }).promise();
    
    for (const item of userDataResult.Items) {
      await dynamodb.delete({
        TableName: TABLES.USER_DATA,
        Key: { email: item.email }
      }).promise();
    }
    console.log(`✅ Cleared ${userDataResult.Items.length} user data records`);
    
    // Clear users
    console.log('🗑️ Clearing users...');
    const usersResult = await dynamodb.scan({
      TableName: TABLES.USERS
    }).promise();
    
    for (const item of usersResult.Items) {
      await dynamodb.delete({
        TableName: TABLES.USERS,
        Key: { email: item.email }
      }).promise();
    }
    console.log(`✅ Cleared ${usersResult.Items.length} users`);
    
    console.log('🎉 Server data cleanup completed successfully!');
    console.log('📝 The database is now clean and ready for the new simplified API.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearAllData(); 