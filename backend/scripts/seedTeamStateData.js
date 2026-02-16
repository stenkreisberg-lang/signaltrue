import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://signaltrue:123signaltrue@cluster0.4olk5ma.mongodb.net/signaltrue?retryWrites=true&w=majority';

// Sample TeamState data for demo/testing
const sampleTeamStates = [
  {
    weekNum: 1,
    bdi: 72,
    zone: 'Stable',
    signals: {
      communication: { score: 78, trend: 'stable' },
      engagement: { score: 71, trend: 'stable' },
      workload: { score: 68, trend: 'stable' },
      collaboration: { score: 75, trend: 'stable' }
    },
    metrics: {
      messageCount: 245,
      meetingHours: 12,
      afterHoursActivity: 8,
      responseTime: 2.4
    },
    riskLevel: 'low',
    weekStart: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    weekEnd: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    weekNum: 2,
    bdi: 68,
    zone: 'Watch',
    signals: {
      communication: { score: 72, trend: 'declining' },
      engagement: { score: 65, trend: 'declining' },
      workload: { score: 62, trend: 'declining' },
      collaboration: { score: 70, trend: 'stable' }
    },
    metrics: {
      messageCount: 198,
      meetingHours: 16,
      afterHoursActivity: 14,
      responseTime: 3.2
    },
    riskLevel: 'medium',
    weekStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    weekEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    weekNum: 3,
    bdi: 74,
    zone: 'Stable',
    signals: {
      communication: { score: 80, trend: 'improving' },
      engagement: { score: 72, trend: 'improving' },
      workload: { score: 70, trend: 'improving' },
      collaboration: { score: 78, trend: 'improving' }
    },
    metrics: {
      messageCount: 312,
      meetingHours: 11,
      afterHoursActivity: 6,
      responseTime: 1.8
    },
    riskLevel: 'low',
    weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    weekEnd: new Date()
  }
];

async function seedTeamStateData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const orgId = new mongoose.Types.ObjectId('693bff1d7182d336060c8629');
    const teamId = new mongoose.Types.ObjectId('693bff1d7182d336060c862b');

    const teamStatesCollection = mongoose.connection.db.collection('teamstates');

    // Check existing data
    const existingCount = await teamStatesCollection.countDocuments({ teamId });
    console.log(`Existing TeamState records for team: ${existingCount}`);

    if (existingCount > 0) {
      console.log('TeamState data already exists. Skipping seed.');
      console.log('\nTo replace data, first delete existing records with:');
      console.log(`db.teamstates.deleteMany({ teamId: ObjectId("693bff1d7182d336060c862b") })`);
    } else {
      // Insert sample data
      const teamStates = sampleTeamStates.map(state => ({
        ...state,
        teamId,
        orgId,
        createdAt: state.weekEnd,
        updatedAt: new Date()
      }));

      const result = await teamStatesCollection.insertMany(teamStates);
      console.log(`\n✅ Inserted ${result.insertedCount} TeamState records!`);
      console.log('\nInserted BDI values:');
      sampleTeamStates.forEach(s => {
        console.log(`  Week ${s.weekNum}: BDI ${s.bdi} (${s.zone})`);
      });
    }

    // Verify user has teamId
    const usersCollection = mongoose.connection.db.collection('users');
    const user = await usersCollection.findOne({ email: 'sten.kreisberg@signaltrue.ai' });
    
    if (user) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  teamId: ${user.teamId || 'NOT SET'}`);
      console.log(`  orgId: ${user.orgId || 'NOT SET'}`);
      
      // Ensure user has teamId
      if (!user.teamId) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { teamId: teamId } }
        );
        console.log('  ✅ Updated user with teamId');
      }
    }

    console.log('\n🎉 Dashboard should now show BDI metrics!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedTeamStateData();
