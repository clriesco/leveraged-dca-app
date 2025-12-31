import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Increase timeout for e2e tests
jest.setTimeout(120000);

// Global setup
beforeAll(async () => {
  console.log('🧪 Test suite starting...');
});

afterAll(async () => {
  console.log('🧪 Test suite completed.');
});

