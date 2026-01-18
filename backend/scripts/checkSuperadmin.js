import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import User from '../models/user.js';

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const user = await User.findOne({ email: 'sten.kreisberg@gmail.com' }).select('+password');
  console.log('User found:', !!user);
  if (user) {
    console.log('Has password:', !!user.password);
    console.log('Password hash starts with:', user.password?.substring(0, 20));
    console.log('orgId:', user.orgId);
    console.log('teamId:', user.teamId);
    console.log('isMasterAdmin:', user.isMasterAdmin);
    console.log('accountStatus:', user.accountStatus);
    
    try {
      const isMatch = await user.comparePassword('Superadmin123');
      console.log('Password matches:', isMatch);
    } catch (err) {
      console.log('Password compare error:', err.message);
    }
  }
  
  await mongoose.disconnect();
}

check();
