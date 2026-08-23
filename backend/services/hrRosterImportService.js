import fs from 'node:fs/promises';
import path from 'node:path';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import {
  classifyEmployeeCandidate,
  normalizeDirectoryString,
  normalizeEmail,
} from '../utils/employeeIdentity.js';
import {
  getOrCreateUnassignedTeam,
  normalizeDepartmentName,
  refreshTeamSizes,
  remapWorkEventTeams,
} from './employeeSyncService.js';

const MAX_SKIPPED_ROWS_RETURNED = 100;

const FIELD_ALIASES = {
  firstName: ['firstname', 'first', 'givenname', 'given', 'eesnimi'],
  lastName: ['lastname', 'last', 'surname', 'familyname', 'family', 'perenimi', 'perekonnanimi'],
  name: ['name', 'fullname', 'displayname', 'employeename', 'employee', 'worker', 'tootaja'],
  email: ['email', 'emailaddress', 'workemail', 'mail', 'primaryemail'],
  position: ['position', 'title', 'jobtitle', 'role', 'ametikoht'],
  team: ['team', 'teamname', 'department', 'dept', 'unit', 'orgunit', 'division', 'osakond'],
  department: ['department', 'dept', 'unit', 'orgunit', 'division', 'osakond'],
};

function normalizeHeader(value) {
  const normalized = normalizeDirectoryString(value);
  if (!normalized) return undefined;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getAliasedValue(row, field) {
  const aliases = FIELD_ALIASES[field];
  const entries = Object.entries(row || {}).map(([key, value]) => [normalizeHeader(key), value]);
  const match = entries.find(([key]) => key && aliases.includes(key));
  return normalizeDirectoryString(match?.[1]);
}

function canonicalizeRosterRow(row, index) {
  const team = getAliasedValue(row, 'team');
  const department = getAliasedValue(row, 'department');
  return {
    rowNumber: index + 2,
    firstName: getAliasedValue(row, 'firstName'),
    lastName: getAliasedValue(row, 'lastName'),
    name: getAliasedValue(row, 'name'),
    email: normalizeEmail(getAliasedValue(row, 'email')),
    position: getAliasedValue(row, 'position'),
    team,
    department: department || team,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getOrCreateRosterTeam(orgId, rawTeamName, teamsByName, stats) {
  const teamName = normalizeDepartmentName(rawTeamName);
  if (!teamName) return null;

  const key = teamName.toLowerCase();
  if (teamsByName.has(key)) return teamsByName.get(key);

  let team = await Team.findOne({
    orgId,
    name: new RegExp(`^${escapeRegex(teamName)}$`, 'i'),
  });

  if (!team) {
    team = await Team.create({
      name: teamName,
      orgId,
      isActive: true,
      metadata: {
        function: 'Other',
        sourceDepartment: teamName,
        autoCreatedFromDirectory: true,
      },
    });
    stats.teamsCreated++;
  }

  teamsByName.set(key, team);
  return team;
}

function pushSkipped(stats, rowNumber, email, reason) {
  stats.skipped++;
  if (stats.skippedRows.length < MAX_SKIPPED_ROWS_RETURNED) {
    stats.skippedRows.push({ rowNumber, email: email || null, reason });
  }
}

function normalizePdfLine(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  return normalized || null;
}

function splitTableLine(line) {
  const normalized = normalizePdfLine(line);
  if (!normalized) return [];
  if (normalized.includes('\t')) return normalized.split('\t').map(normalizeDirectoryString);
  if (normalized.includes('|')) return normalized.split('|').map(normalizeDirectoryString);
  const wideSpaceParts = normalized.split(/\s{2,}/).map(normalizeDirectoryString);
  if (wideSpaceParts.length > 1) return wideSpaceParts;
  if (normalized.includes(',')) return normalized.split(',').map(normalizeDirectoryString);
  return [normalized];
}

function parseHeaderedPdfLines(lines, headerIndex) {
  const headers = splitTableLine(lines[headerIndex]).filter(Boolean);
  if (headers.length < 2) return [];

  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const values = splitTableLine(line).filter((value) => value !== null);
    if (values.length < 2) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseFreeformPdfLines(lines) {
  const rows = [];

  for (const line of lines) {
    const emailMatch = line.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (!emailMatch) continue;

    const beforeEmail = normalizeDirectoryString(
      line.slice(0, emailMatch.index).replace(/^\d+[\s.)-]*/, '')
    );
    const afterEmail = normalizeDirectoryString(
      line.slice(emailMatch.index + emailMatch[0].length)
    );
    const afterParts = splitTableLine(afterEmail).filter(Boolean);

    rows.push({
      name: beforeEmail,
      email: emailMatch[0],
      position: afterParts[0] || '',
      department: afterParts[1] || '',
    });
  }

  return rows;
}

export function parseHrRosterPdfText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(normalizePdfLine)
    .filter((line) => line && line.length > 2);

  const headerIndex = lines.findIndex((line) => {
    const normalized = normalizeHeader(line) || '';
    return (
      normalized.includes('email') &&
      (normalized.includes('name') || normalized.includes('firstname')) &&
      (normalized.includes('position') ||
        normalized.includes('title') ||
        normalized.includes('department') ||
        normalized.includes('team'))
    );
  });

  if (headerIndex >= 0) {
    const rows = parseHeaderedPdfLines(lines, headerIndex);
    if (rows.length > 0) return rows;
  }

  return parseFreeformPdfLines(lines);
}

function getUploadedFileName(file) {
  return file.originalname || file.originalName || file.clientReportedFileName || '';
}

async function getUploadedFileBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path) {
    const data = await fs.readFile(file.path);
    await fs.unlink(file.path).catch(() => {});
    return data;
  }
  if (file.stream) {
    const chunks = [];
    for await (const chunk of file.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Uploaded roster file could not be read.');
}

export async function parseHrRosterFile(file) {
  const extension = path.extname(getUploadedFileName(file)).toLowerCase();
  const buffer = await getUploadedFileBuffer(file);

  if (extension === '.xlsx') {
    const { default: readXlsxFile } = await import('read-excel-file/node');
    const [headers = [], ...rows] = await readXlsxFile(buffer);
    return rows
      .filter((row) => row.some((value) => value !== null && value !== ''))
      .map((row) =>
        Object.fromEntries(headers.map((header, index) => [String(header || ''), row[index] ?? '']))
      );
  }

  if (extension === '.csv') {
    const { parse } = await import('csv-parse/sync');
    return parse(buffer, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  }

  if (extension === '.xls') {
    throw new Error('Legacy .xls files are not supported. Export the roster as .xlsx or CSV.');
  }

  if (extension === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parseHrRosterPdfText(parsed.text);
    } finally {
      await parser.destroy();
    }
  }

  throw new Error('Unsupported file type. Upload CSV, XLSX, or PDF.');
}

export async function importHrRosterRows(orgId, rows, options = {}) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');

  const stats = {
    sourceFilename: options.sourceFilename || null,
    rowsProcessed: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    teamsCreated: 0,
    skippedRows: [],
  };

  const unassignedTeam = await getOrCreateUnassignedTeam(orgId);
  const teams = await Team.find({ orgId });
  const teamsByName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
  teamsByName.set('unassigned', unassignedTeam);

  for (const [index, row] of rows.entries()) {
    const canonical = canonicalizeRosterRow(row, index);
    const identity = classifyEmployeeCandidate({
      email: canonical.email,
      firstName: canonical.firstName,
      lastName: canonical.lastName,
      name: canonical.name,
      displayName: canonical.name,
      title: canonical.position,
      department: canonical.department,
    });

    if (!identity.ok) {
      pushSkipped(stats, canonical.rowNumber, canonical.email, identity.reason);
      continue;
    }

    const team =
      (await getOrCreateRosterTeam(
        orgId,
        canonical.team || canonical.department,
        teamsByName,
        stats
      )) || unassignedTeam;

    const existing = await User.findOne({ orgId, email: identity.email });
    const profile = {
      ...(existing?.profile?.toObject ? existing.profile.toObject() : existing?.profile || {}),
      title: canonical.position || existing?.profile?.title,
      department: canonical.department || canonical.team || existing?.profile?.department,
    };

    if (existing) {
      existing.name = identity.name;
      existing.firstName = identity.firstName;
      existing.lastName = identity.lastName;
      existing.teamId = team._id;
      existing.profile = profile;
      if (existing.accountStatus === 'inactive') existing.accountStatus = 'pending';
      await existing.save();
      stats.updated++;
    } else {
      await User.create({
        email: identity.email,
        name: identity.name,
        firstName: identity.firstName,
        lastName: identity.lastName,
        password: Math.random().toString(36).slice(-12),
        accountStatus: 'pending',
        source: 'hr_import',
        role: 'team_member',
        orgId,
        teamId: team._id,
        profile,
      });
      stats.created++;
    }
  }

  await refreshTeamSizes(orgId, Math.max(5, org.settings?.minTeamSize ?? 5));
  const eventRemap = await remapWorkEventTeams(orgId);

  return {
    success: true,
    stats,
    eventRemap,
  };
}
