import fs from 'node:fs/promises';
import path from 'node:path';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import ManagerAssignment from '../models/managerAssignment.js';
import { parseDepartmentManagerRosterSheet } from './departmentManagerRosterService.js';
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
  email: ['email', 'emailaddress', 'workemail', 'mail', 'primaryemail', 'epost'],
  position: ['position', 'title', 'jobtitle', 'role', 'ametikoht', 'amet', 'ametinimetus'],
  team: [
    'team',
    'teamname',
    'department',
    'dept',
    'unit',
    'orgunit',
    'division',
    'osakond',
    'uksus',
    'meeskond',
  ],
  department: ['department', 'dept', 'unit', 'orgunit', 'division', 'osakond', 'uksus'],
  status: [
    'status',
    'employmentstatus',
    'accountstatus',
    'active',
    'isactive',
    'employmentstate',
    'staatus',
    'toosuhe',
    'toostatus',
  ],
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
    status: getAliasedValue(row, 'status'),
    managerEmail: normalizeEmail(row?.['Manager Email']),
    sourceFormat: row?.['Roster Format'] || null,
  };
}

function isInactiveRosterStatus(status) {
  if (!status) return false;
  const normalized = normalizeHeader(status) || '';
  return [
    'inactive',
    'disabled',
    'deleted',
    'terminated',
    'former',
    'left',
    'departed',
    'inactiveemployee',
    'endnud',
    'lahkunud',
    'suletud',
    'peatatud',
  ].includes(normalized);
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
    const allRows = await readXlsxFile(buffer);
    const structured = parseDepartmentManagerRosterSheet(allRows);
    if (structured) return structured.rows;
    const [headers = [], ...rows] = allRows;
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
    inactiveSkipped: 0,
    teamsCreated: 0,
    matchedByUniqueDirectoryName: 0,
    managersPrepared: 0,
    managerScopesHeld: 0,
    skippedRows: [],
  };

  const unassignedTeam = await getOrCreateUnassignedTeam(orgId);
  const teams = await Team.find({ orgId });
  const teamsByName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
  teamsByName.set('unassigned', unassignedTeam);

  // A manager-labelled HR workbook contains employee names, but no employee
  // emails. Reconcile only against UNIQUE existing directory identities; never
  // guess addresses or create employee accounts from names.
  const knownDirectory = rows.some(row => row?.['Roster Format'] === 'department_manager')
    ? await User.find({ orgId, accountStatus: { $ne: 'inactive' } })
        .select('_id name displayName firstName lastName email accountStatus').lean()
    : [];
  const directoryByName = new Map();
  const canonicalName = name => normalizeDirectoryString(name)?.normalize('NFKC').toLocaleLowerCase('et') || '';
  for (const person of knownDirectory) {
    const display = person.name || person.displayName ||
      [person.firstName, person.lastName].filter(Boolean).join(' ');
    const lookup = canonicalName(display);
    if (!lookup) continue;
    if (!directoryByName.has(lookup)) directoryByName.set(lookup, []);
    directoryByName.get(lookup).push(person);
  }
  const managerScopes = new Map();

  for (const [index, row] of rows.entries()) {
    const canonical = canonicalizeRosterRow(row, index);
    if (canonical.sourceFormat === 'department_manager' && !canonical.email) {
      if (!canonical.team) {
        pushSkipped(stats, canonical.rowNumber, null, 'unassigned_employee');
        continue;
      }
      const matches = directoryByName.get(canonicalName(canonical.name)) || [];
      if (matches.length !== 1 || !matches[0].email) {
        pushSkipped(stats, canonical.rowNumber, null,
          matches.length > 1 ? 'ambiguous_directory_name' : 'missing_directory_identity');
        continue;
      }
      canonical.email = normalizeEmail(matches[0].email);
      stats.matchedByUniqueDirectoryName++;
    }
    if (isInactiveRosterStatus(canonical.status)) {
      stats.inactiveSkipped++;
      pushSkipped(stats, canonical.rowNumber, canonical.email, 'inactive_employee');
      continue;
    }
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

    if (canonical.sourceFormat === 'department_manager' && canonical.managerEmail) {
      const scopeKey = String(team._id) + ':' + canonical.managerEmail;
      if (!managerScopes.has(scopeKey)) managerScopes.set(scopeKey, {
        team, managerEmail: canonical.managerEmail, matched: 0,
      });
      managerScopes.get(scopeKey).matched++;
    }

    if (existing) {
      existing.name = identity.name;
      existing.firstName = identity.firstName;
      existing.lastName = identity.lastName;
      const verifiedHrScope = canonical.sourceFormat === 'department_manager' && options.approvedBy;
      if (!existing.hrStructure?.teamVerifiedAt || verifiedHrScope) existing.teamId = team._id;
      if (verifiedHrScope) {
        // Explicit HR approval is effective-dated, so nightly directory sync
        // cannot silently replace this team and history before approval is not rewritten.
        existing.hrStructure = { teamVerifiedAt: new Date(), verifiedBy: options.approvedBy };
      }
      existing.profile = profile;
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

  await refreshTeamSizes(orgId, Math.max(2, Number(org.settings?.minTeamSize) || 2));
  const eventRemap = await remapWorkEventTeams(orgId);

  // HR upload can prepare manager grants, but cannot activate them or send
  // invitations. Each manager must later accept their scoped invitation.
  if (options.applyManagers === true && options.approvedBy) {
    for (const scope of managerScopes.values()) {
      const manager = await User.findOne({ orgId, email: scope.managerEmail,
        accountStatus: { $ne: 'inactive' } }).select('_id').lean();
      if (!manager || scope.matched < 2) {
        stats.managerScopesHeld++;
        continue;
      }
      const existingAssignment = await ManagerAssignment.findOne({ orgId,
        managerUserId: manager._id, teamId: scope.team._id });
      if (existingAssignment) {
        if (existingAssignment.status !== 'pending') continue;
      } else {
        await ManagerAssignment.create({ orgId, managerUserId: manager._id,
          teamId: scope.team._id, invitedBy: options.approvedBy,
          status: 'pending', weeklyEmailEnabled: false, exportEnabled: false });
      }
      stats.managersPrepared++;
    }
  }

  return {
    success: true,
    stats,
    eventRemap,
  };
}
