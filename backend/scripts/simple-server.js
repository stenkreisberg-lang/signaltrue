import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from './models/user.js';
import { encryptString } from './utils/crypto.js';
import jwt from 'jsonwebtoken';

// --- Basic Setup ---
dotenv.config({ path: './backend/.env' });
const app = express();
const PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- The ONLY Route ---
app.post('/api/auth/login', async (req, res) => {
  console.log('[SIMPLE SERVER] Login endpoint hit');
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const encryptedEmail = encryptString(email.toLowerCase());
    console.log(`[SIMPLE SERVER] Finding user with encrypted email: ${encryptedEmail}`);
    
    const user = await User.findOne({ email: encryptedEmail });
    console.log('[SIMPLE SERVER] User lookup result:', user ? `User found (ID: ${user._id})` : 'User not found');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('[SIMPLE SERVER] Password comparison result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[SIMPLE SERVER] Login successful for user ID: ${user._id}.`);
    
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });

  } catch (error) {
    console.error('[SIMPLE SERVER] Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- Startup Function ---
async function startServer() {
  try {
    console.log('[SIMPLE SERVER] Starting...');
    if (process.env.USE_IN_MEMORY_DB === '1') {
      console.log('[SIMPLE SERVER] Using in-memory database.');
      const mem = await MongoMemoryServer.create();
      const uri = mem.getUri();
      await mongoose.connect(uri);
      console.log('[SIMPLE SERVER] In-memory DB connected.');
    } else {
      console.log('[SIMPLE SERVER] Using MONGO_URI.');
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[SIMPLE SERVER] MongoDB connected.');
    }

    app.listen(PORT, () => {
      console.log(`[SIMPLE SERVER] 🚀 Now listening on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('[SIMPLE SERVER] Startup failed:', error);
    process.exit(1);
  }
}

startServer();
