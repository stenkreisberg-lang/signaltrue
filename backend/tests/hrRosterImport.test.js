import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { importHrRosterRows, parseHrRosterPdfText } from '../services/hrRosterImportService.js';

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

describe('HR roster import', () => {
  test('creates real employees, sets positions, creates teams, and skips non-employees', async () => {
    const org = await Organization.create({ name: 'Example', domain: 'example.com' });

    const result = await importHrRosterRows(org._id, [
      {
        'First Name': 'Ada',
        Surname: 'Lovelace',
        Email: 'ada@example.com',
        Position: 'Engineering Lead',
        Department: 'Engineering',
      },
      {
        Name: 'Grace Hopper',
        Email: 'grace@example.com',
        Position: 'Principal Engineer',
        Team: 'Engineering',
      },
      {
        Name: 'Meeting Room 4',
        Email: 'room-4@example.com',
        Position: 'Room',
        Department: 'Facilities',
      },
      {
        Name: 'Prince',
        Email: 'prince@example.com',
        Position: 'Artist',
        Department: 'Music',
      },
    ]);

    const engineering = await Team.findOne({ orgId: org._id, name: 'Engineering' }).lean();
    const users = await User.find({ orgId: org._id }).sort({ email: 1 }).lean();

    expect(result.stats).toMatchObject({
      rowsProcessed: 4,
      created: 2,
      updated: 0,
      skipped: 2,
      teamsCreated: 1,
    });
    expect(users.map((user) => user.email)).toEqual(['ada@example.com', 'grace@example.com']);
    expect(users.map((user) => user.firstName)).toEqual(['Ada', 'Grace']);
    expect(users.map((user) => user.lastName)).toEqual(['Lovelace', 'Hopper']);
    expect(users.every((user) => String(user.teamId) === String(engineering._id))).toBe(true);
    expect(users[0].profile.title).toBe('Engineering Lead');
    expect(result.stats.skippedRows.map((row) => row.reason).sort()).toEqual([
      'missing_first_name_or_surname',
      'non_employee_resource_or_service_account',
    ]);
  });

  test('extracts table-like text from PDF exports', () => {
    const rows = parseHrRosterPdfText(`
      Name  Email  Position  Department
      Ada Lovelace  ada@example.com  Engineering Lead  Engineering
      Grace Hopper  grace@example.com  Principal Engineer  Engineering
    `);

    expect(rows).toEqual([
      {
        Name: 'Ada Lovelace',
        Email: 'ada@example.com',
        Position: 'Engineering Lead',
        Department: 'Engineering',
      },
      {
        Name: 'Grace Hopper',
        Email: 'grace@example.com',
        Position: 'Principal Engineer',
        Department: 'Engineering',
      },
    ]);
  });
});
