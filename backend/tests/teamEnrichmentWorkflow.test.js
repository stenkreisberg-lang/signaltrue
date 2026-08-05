import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import TeamMappingSuggestion from '../models/teamMappingSuggestion.js';
import User from '../models/user.js';
import { applyTeamMappingSuggestions } from '../services/publicTeamEnrichmentService.js';

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

describe('automatic public team assignments', () => {
  test('assigns an unassigned user and never overwrites a named team', async () => {
    const org = await Organization.create({ name: 'Example', domain: 'example.com' });
    const [unassigned, existingTeam] = await Team.create([
      { name: 'Unassigned', orgId: org._id },
      { name: 'Sales', orgId: org._id },
    ]);
    const [stillUnassigned, changedBeforeApply] = await User.create([
      {
        name: 'Ada Example',
        email: 'ada@example.com',
        accountStatus: 'pending',
        source: 'microsoft',
        orgId: org._id,
        teamId: unassigned._id,
      },
      {
        name: 'Grace Example',
        email: 'grace@example.com',
        accountStatus: 'pending',
        source: 'microsoft',
        orgId: org._id,
        teamId: unassigned._id,
      },
    ]);
    const suggestions = await TeamMappingSuggestion.create([
      {
        orgId: org._id,
        userId: stillUnassigned._id,
        suggestedTeamName: 'Engineering',
        suggestedFunction: 'Engineering',
        confidence: 94,
        reason: 'Exact public name and role match',
        sourceType: 'public_website',
      },
      {
        orgId: org._id,
        userId: changedBeforeApply._id,
        suggestedTeamName: 'Engineering',
        suggestedFunction: 'Engineering',
        confidence: 94,
        reason: 'Exact public name and role match',
        sourceType: 'public_website',
      },
    ]);

    await User.updateOne({ _id: changedBeforeApply._id }, { $set: { teamId: existingTeam._id } });
    const result = await applyTeamMappingSuggestions({
      orgId: org._id,
      suggestionIds: suggestions.map((suggestion) => suggestion._id),
      decidedBy: new mongoose.Types.ObjectId(),
      decisionMode: 'auto_high_confidence',
    });

    const engineering = await Team.findOne({ orgId: org._id, name: 'Engineering' });
    const [assignedUser, preservedUser] = await Promise.all([
      User.findById(stillUnassigned._id).lean(),
      User.findById(changedBeforeApply._id).lean(),
    ]);
    const reviewed = await TeamMappingSuggestion.find({ orgId: org._id }).sort({ createdAt: 1 });

    expect(result).toEqual({ applied: 1, skipped: 1, reviewed: 2 });
    expect(String(assignedUser.teamId)).toBe(String(engineering._id));
    expect(String(preservedUser.teamId)).toBe(String(existingTeam._id));
    expect(reviewed.map((suggestion) => suggestion.status).sort()).toEqual(['applied', 'skipped']);
    expect(reviewed.every((suggestion) => suggestion.decisionMode === 'auto_high_confidence')).toBe(
      true
    );
  });
});
