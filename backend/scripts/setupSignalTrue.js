/**
 * Setup SignalTrue Organization
 * 
 * Run this script to properly set up the SignalTrue organization
 * and link the admin account.
 * 
 * Usage: node backend/scripts/setupSignalTrue.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = 'sten.kreisberg@signaltrue.ai';
const ORG_NAME = 'SignalTrue';

async function setupSignalTrue() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // 1. Find or create the SignalTrue organization using raw MongoDB
    let org = await db.collection('organizations').findOne({ name: ORG_NAME });
    
    if (!org) {
      const result = await db.collection('organizations').insertOne({
        name: ORG_NAME,
        domain: 'signaltrue.ai',
        industry: 'Technology',
        subscription: { plan: 'trial', status: 'active' },
        settings: { onboardingComplete: false },
        trial: {
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          phase: 'baseline',
          daysRemaining: 30
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      org = await db.collection('organizations').findOne({ _id: result.insertedId });
      console.log('✅ Created SignalTrue organization');
    } else {
      console.log('✅ SignalTrue organization already exists');
    }

    // 2. Find or create a default team
    let team = await db.collection('teams').findOne({ orgId: org._id });
    
    if (!team) {
      const result = await db.collection('teams').insertOne({
        name: 'Leadership',
        orgId: org._id,
        description: 'SignalTrue Leadership Team',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      team = await db.collection('teams').findOne({ _id: result.insertedId });
      console.log('✅ Created Leadership team');
    } else {
      console.log('✅ Team already exists:', team.name);
    }

    // 3. Find and update the admin user
    const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });
    
    if (!user) {
      console.error(`❌ User with email ${ADMIN_EMAIL} not found`);
      console.log('Please register first at https://signaltrue.ai/register');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update user with org and team using updateOne
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: {
          orgId: org._id,
          teamId: team._id,
          role: 'master_admin',
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Updated user:', ADMIN_EMAIL);
    console.log('   - Organization:', org.name);
    console.log('   - Team:', team.name);
    console.log('   - Role: master_admin');

    console.log('\n🎉 Setup complete! You can now log in at https://signaltrue.ai/login');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupSignalTrue();
