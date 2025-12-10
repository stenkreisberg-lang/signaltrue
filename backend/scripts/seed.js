import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';

const SEED_EMAIL = 'test-user@example.com';
const SEED_PASSWORD = 'password123';
const SEED_NAME = 'Test Admin';
const SEED_COMPANY = 'Default Company';

export const seedMasterAdmin = async () => {
  try {
    const existingUser = await User.findOne({ email: SEED_EMAIL });

    if (existingUser) {
      console.log('✅ Seed user already exists. Skipping creation.');
      return;
    }

    console.log('🌱 Seeding initial user...');

    // 1. Create a default Organization
    let org = await Organization.findOne({ name: SEED_COMPANY });
    if (!org) {
      org = new Organization({
        name: SEED_COMPANY,
        industry: 'Technology',
        subscription: { plan: 'trial', status: 'active' },
        settings: { allowRegistration: true },
      });
      await org.save();
      console.log('Created seed organization.');
    }

    // 2. Create a default Team within that Organization
    let team = await Team.findOne({ name: 'General', orgId: org._id });
    if (!team) {
      team = new Team({
        name: 'General',
        orgId: org._id,
      });
      await team.save();
      console.log('Created seed team.');
    }

    // 3. Create the User
    const user = new User({
      name: SEED_NAME,
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      role: 'admin',
      orgId: org._id,
      teamId: team._id,
    });

    await user.save();
    console.log('✅ Successfully seeded initial admin user.');

  } catch (error) {
    console.error('❌ Error seeding initial user:', error.message);
    // Don't block server start if seeding fails, but log it.
  }
};
