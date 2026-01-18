import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Update email to normalized version (without the dot for Gmail)
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'sten.kreisberg@gmail.com' },
    { $set: { email: 'stenkreisberg@gmail.com' } }
  );
  
  console.log('Updated:', result.modifiedCount);
  
  // Verify
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'stenkreisberg@gmail.com' });
  console.log('User email now:', user?.email);
  
  await mongoose.disconnect();
}

fix();
