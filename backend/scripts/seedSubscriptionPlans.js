/**
 * Seed Subscription Plans
 * 
 * Initializes the three pricing tiers in the database.
 * Run this once during deployment or database setup.
 */

import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { PLAN_DEFINITIONS } from '../utils/subscriptionConstants.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedSubscriptionPlans() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/signaltrue';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete existing plans (for clean seed)
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Create plans from definitions
    const plans = Object.values(PLAN_DEFINITIONS).map(planDef => ({
      planId: planDef.planId,
      name: planDef.name,
      priceEUR: planDef.priceEUR,
      features: planDef.features,
      isActive: true
    }));

    const createdPlans = await SubscriptionPlan.insertMany(plans);
    
    console.log('\n✅ Successfully seeded subscription plans:');
    createdPlans.forEach(plan => {
      console.log(`\n${plan.name} (${plan.planId})`);
      console.log(`  Price: ${plan.priceEUR ? `€${plan.priceEUR}` : 'Custom'}`);
      console.log(`  Features:`);
      Object.entries(plan.features).forEach(([feature, enabled]) => {
        console.log(`    ${feature}: ${enabled ? '✓' : '✗'}`);
      });
    });

    console.log('\n🎉 Subscription plans seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionPlans();
}

export default seedSubscriptionPlans;
