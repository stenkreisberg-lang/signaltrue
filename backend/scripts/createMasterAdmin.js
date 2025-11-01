import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Simple User model for script
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: String,
  isMasterAdmin: Boolean,
  orgId: mongoose.Schema.Types.ObjectId,
  teamId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createMasterAdmin() {
  try {
    console.log('\n👑 Master Admin Creation Script');
    console.log('================================\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/signaltrue';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get master admin details
    const email = await question('Master Admin Email: ');
    const password = await question('Master Admin Password: ');
    const name = await question('Master Admin Name: ');

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('\n⚠️  User with this email already exists.');
      
      const update = await question('Update to master admin? (yes/no): ');
      if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
        existingUser.isMasterAdmin = true;
        existingUser.role = 'master_admin';
        existingUser.name = name || existingUser.name;
        
        if (password) {
          const salt = await bcrypt.genSalt(10);
          existingUser.password = await bcrypt.hash(password, salt);
        }
        
        await existingUser.save();
        console.log('\n✅ User updated to master admin successfully!');
      } else {
        console.log('\n❌ Cancelled.');
      }
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create master admin
      const masterAdmin = new User({
        email,
        password: hashedPassword,
        name,
        role: 'master_admin',
        isMasterAdmin: true
      });

      await masterAdmin.save();
      console.log('\n✅ Master admin created successfully!');
    }

    console.log('\n================================');
    console.log('Master Admin Credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: [hidden]`);
    console.log('\nLogin at: http://localhost:3000/login');
    console.log('================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

createMasterAdmin();
