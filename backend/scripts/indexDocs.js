/**
 * Script to index SignalTrue documentation into the vector store
 * 
 * Run this script after updating documentation files:
 * node scripts/indexDocs.js
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import service
import { indexAllDocuments } from '../services/embeddingService.js';

async function main() {
  console.log('🚀 SignalTrue Document Indexing Script');
  console.log('=====================================\n');
  
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required');
    process.exit(1);
  }
  
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is required');
    process.exit(1);
  }
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Run indexing
    const result = await indexAllDocuments();
    
    console.log('\n=====================================');
    console.log(`✅ Indexing complete!`);
    console.log(`   Total chunks: ${result.totalChunks}`);
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

main();
