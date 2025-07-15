const AWS = require('aws-sdk');
require('dotenv').config();

// AWS Configuration
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();

async function createGoalCompletionsTable() {
  const params = {
    TableName: 'goalaroo-goal-completions',
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' },  // Partition key
      { AttributeName: 'goalId', KeyType: 'RANGE' } // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'goalId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  };

  try {
    console.log('Creating goal completions table...');
    await dynamodb.createTable(params).promise();
    console.log('✅ Goal completions table created successfully!');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('✅ Goal completions table already exists');
    } else {
      console.error('❌ Error creating table:', error);
    }
  }
}

async function main() {
  console.log('Setting up DynamoDB tables...');
  await createGoalCompletionsTable();
  console.log('Done!');
}

main().catch(console.error); 