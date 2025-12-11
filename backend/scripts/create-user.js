import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';

dotenv.config({ path: './backend/.env' });

const createUser = async () => {
  if (process.argv.length < 5) {
    console.error('Usage: node backend/scripts/create-user.js <email> <password> <name>');
    process.exit(1);
  }

  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI not found in .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected...');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email "${email}" already exists.`);
      return;
    }

    // Create a new Organization
    const domain = email.split('@')[1].split('.')[0];
    const orgName = domain.charAt(0).toUpperCase() + domain.slice(1);
    const newOrg = new Organization({ name: orgName, domain });
    await newOrg.save();

    // Create a new Team
    const defaultTeam = new Team({
      name: 'General',
      organizationId: newOrg._id,
    });
    await defaultTeam.save();

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: 'viewer',
      teamId: defaultTeam._id,
      orgId: newOrg._id,
    });
    await user.save();

    console.log(`Successfully created user "${name}" with email "${email}".`);
    console.log(`Organization: "${newOrg.name}"`);
    console.log(`Team: "${defaultTeam.name}"`);

  } catch (error) {
    console.error('An error occurred during user creation:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

createUser();
