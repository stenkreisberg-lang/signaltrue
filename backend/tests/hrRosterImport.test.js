import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import {
  importHrRosterRows,
  parseHrRosterFile,
  parseHrRosterPdfText,
} from '../services/hrRosterImportService.js';

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

  test('parses temp-file uploads from multer v3', async () => {
    const filePath = path.join(os.tmpdir(), `signaltrue-roster-${Date.now()}.csv`);
    await fs.writeFile(
      filePath,
      'Name,Email,Position,Department\nAda Lovelace,ada@example.com,Engineering Lead,Engineering\n'
    );

    const rows = await parseHrRosterFile({
      originalName: 'employees.csv',
      path: filePath,
    });

    expect(rows).toEqual([
      {
        Name: 'Ada Lovelace',
        Email: 'ada@example.com',
        Position: 'Engineering Lead',
        Department: 'Engineering',
      },
    ]);
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  test('rejects legacy XLS with a useful conversion instruction', async () => {
    await expect(
      parseHrRosterFile({ originalName: 'employees.xls', buffer: Buffer.from('legacy') })
    ).rejects.toThrow('Export the roster as .xlsx or CSV');
  });

  test('recognizes Estonian headers and excludes inactive roster rows', async () => {
    const org = await Organization.create({ name: 'Tehnopol', domain: 'tehnopol.ee' });

    const result = await importHrRosterRows(org._id, [
      {
        Eesnimi: 'Triin',
        Perekonnanimi: 'Kuldmaa',
        'E-post': 'triin@tehnopol.ee',
        Ametinimetus: 'HR',
        Üksus: 'People',
        Staatus: 'aktiivne',
      },
      {
        Eesnimi: 'Former',
        Perekonnanimi: 'Employee',
        'E-post': 'former@tehnopol.ee',
        Üksus: 'People',
        Staatus: 'lahkunud',
      },
    ]);

    expect(result.stats).toMatchObject({
      created: 1,
      inactiveSkipped: 1,
      skipped: 1,
    });
    expect(await User.countDocuments({ orgId: org._id })).toBe(1);
    expect(await User.findOne({ email: 'triin@tehnopol.ee' })).toMatchObject({
      firstName: 'Triin',
      lastName: 'Kuldmaa',
    });
  });

  test('does not reactivate an inactive existing employee during roster import', async () => {
    const org = await Organization.create({ name: 'Example', domain: 'example.com' });
    const team = await Team.create({ name: 'People', orgId: org._id });
    await User.create({
      email: 'former@example.com',
      name: 'Former Employee',
      password: 'temporary',
      accountStatus: 'inactive',
      source: 'microsoft',
      role: 'team_member',
      orgId: org._id,
      teamId: team._id,
    });

    await importHrRosterRows(org._id, [
      { Name: 'Former Employee', Email: 'former@example.com', Team: 'People' },
    ]);

    expect(await User.findOne({ email: 'former@example.com' })).toMatchObject({
      accountStatus: 'inactive',
    });
  });
});
