/**
 * Migration Script: Add Subscription Fields to Existing Organizations
 * 
 * Run this ONCE after deploying the pricing model to update existing orgs.
 */

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateOrganizations() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/signaltrue';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find organizations without subscription plan
    const orgsToMigrate = await Organization.find({
      $or: [
        { subscriptionPlanId: { $exists: false } },
        { subscriptionPlanId: null }
      ]
    });

    console.log(`\nFound ${orgsToMigrate.length} organizations to migrate`);

    if (orgsToMigrate.length === 0) {
      console.log('✅ All organizations already have subscription plans!');
      return;
    }

    // Prompt for default plan (in real scenario, you might assign based on existing criteria)
    const defaultPlanId = process.env.DEFAULT_MIGRATION_PLAN || 'team';
    
    console.log(`\nMigrating organizations to "${defaultPlanId}" plan...`);
    console.log('(You can override this by setting DEFAULT_MIGRATION_PLAN env variable)\n');

    // Update each organization
    let successCount = 0;
    let errorCount = 0;

    for (const org of orgsToMigrate) {
      try {
        org.subscriptionPlanId = defaultPlanId;
        
        // Initialize custom features (disabled by default)
        if (!org.customFeatures) {
          org.customFeatures = {
            enableBoardReports: false,
            enableCustomThresholds: false,
            enableCustomAiPrompts: false,
            enableQuarterlyReviews: false
          };
        }

        // Initialize subscription history
        if (!org.subscriptionHistory) {
          org.subscriptionHistory = [{
            planId: defaultPlanId,
            changedAt: new Date(),
            action: 'initial'
          }];
        }

        await org.save();
        
        console.log(`✓ Migrated: ${org.name} (${org._id}) → ${defaultPlanId}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to migrate ${org.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`✅ Successfully migrated: ${successCount} organizations`);
    
    if (errorCount > 0) {
      console.log(`❌ Failed to migrate: ${errorCount} organizations`);
    }

    console.log('\n🎉 Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Review organizations in your database');
    console.log('2. Manually upgrade premium customers to "leadership" or "custom" plans');
    console.log('3. Run the subscription seed script if you haven\'t already');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Advanced migration with custom logic
async function migrateWithCustomLogic() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/signaltrue';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const orgsToMigrate = await Organization.find({
      $or: [
        { subscriptionPlanId: { $exists: false } },
        { subscriptionPlanId: null }
      ]
    });

    console.log(`\nFound ${orgsToMigrate.length} organizations to migrate with custom logic`);

    for (const org of orgsToMigrate) {
      let planId = 'team'; // Default

      // Example: Assign plan based on existing subscription field
      if (org.subscription?.plan === 'premium') {
        planId = 'leadership';
      } else if (org.subscription?.plan === 'enterprise') {
        planId = 'custom';
      }

      // Example: Assign plan based on organization size
      const orgSize = parseInt(org.size);
      if (orgSize > 500) {
        planId = 'leadership'; // Large orgs get Leadership by default
      }

      // Example: Assign plan based on industry
      if (org.industry === 'Enterprise Software' || org.industry === 'Financial Services') {
        planId = 'leadership'; // Premium industries
      }

      org.subscriptionPlanId = planId;
      
      if (!org.customFeatures) {
        org.customFeatures = {
          enableBoardReports: planId === 'custom',
          enableCustomThresholds: planId === 'custom',
          enableCustomAiPrompts: planId === 'custom',
          enableQuarterlyReviews: planId === 'custom'
        };
      }

      if (!org.subscriptionHistory) {
        org.subscriptionHistory = [{
          planId,
          changedAt: new Date(),
          action: 'initial'
        }];
      }

      await org.save();
      console.log(`✓ Migrated: ${org.name} → ${planId} (size: ${org.size}, industry: ${org.industry})`);
    }

    console.log('\n🎉 Custom migration complete!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
const mode = process.argv[2];

if (mode === 'custom') {
  console.log('Running migration with custom logic...\n');
  migrateWithCustomLogic();
} else {
  console.log('Running standard migration...\n');
  migrateOrganizations();
}

export { migrateOrganizations, migrateWithCustomLogic };
