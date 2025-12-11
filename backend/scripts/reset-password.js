import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';

dotenv.config({ path: './backend/.env' });

const resetPassword = async () => {
  if (process.argv.length < 4) {
    console.error('Usage: node backend/scripts/reset-password.js <email> <newPassword>');
    process.exit(1);
  }

  const email = process.argv[2];
  const newPassword = process.argv[3];
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI not found in .env file. Please ensure it is set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log('MongoDB connected...');

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email "${email}" not found.`);
      process.exit(0);
    }

    user.password = newPassword; // The 'pre-save' hook in the User model will hash it
    await user.save();

    console.log(`Password for user "${email}" has been successfully reset.`);
    
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

resetPassword();
