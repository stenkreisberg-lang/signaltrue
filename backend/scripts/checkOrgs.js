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

  const newPassword = process.env.SUPERADMIN_RESET_PASSWORD;
  if (!newPassword) throw new Error('SUPERADMIN_RESET_PASSWORD is required');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await db
    .collection('users')
    .updateOne({ email: 'sten.kreisberg@gmail.com' }, { $set: { password: hashedPassword } });

  console.log('Password reset for sten.kreisberg@gmail.com');
  console.log('Superadmin password reset from environment configuration');
  console.log('Modified:', result.modifiedCount);

  await mongoose.disconnect();
}

resetPassword();
