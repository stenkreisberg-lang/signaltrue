import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function resetPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const newPassword = 'Superadmin123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await db.collection('users').updateOne(
    { email: 'sten.kreisberg@gmail.com' },
    { $set: { password: hashedPassword } }
  );

  console.log('Password reset for sten.kreisberg@gmail.com');
  console.log('New password: Superadmin123');
  console.log('Modified:', result.modifiedCount);

  await mongoose.disconnect();
}

resetPassword();
