/**
 * Parse an HR-approved department/manager workbook without inventing staff emails.
 * This is intentionally pure. No user, team or permission is changed by parsing.
 */
const clean = value => String(value ?? '').normalize('NFKC').trim();
const key = value => clean(value).toLocaleLowerCase('et');
const emailFrom = value => clean(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() || null;

export function parseDepartmentManagerRosterSheet(grid) {
  if (!Array.isArray(grid)) return null;
  const headerIndex = grid.findIndex(row => Array.isArray(row) &&
    key(row[0]) === 'osakond' &&
    key(row[1]).includes('juht') &&
    key(row[2]).includes('töötaja nimi'));
  if (headerIndex < 0) return null;

  let department = '';
  let managerEmail = null;
  let managerName = '';
  const entries = [];
  const managers = new Map();
  const exceptions = [];

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const [rawDepartment, rawManager, rawEmployee] = grid[i] || [];
    if (clean(rawDepartment)) {
      department = clean(rawDepartment);
      managerEmail = null;
      managerName = '';
    }
    if (clean(rawManager)) {
      managerEmail = emailFrom(rawManager);
      managerName = clean(rawManager).split(/\r?\n/)[0].trim();
      if (!department || !managerName) {
        exceptions.push({ row: i + 1, reason: 'manager_missing_department_or_name' });
      } else {
        managers.set(key(department) + '|' + (managerEmail || 'name:' + key(managerName)), {
          department, managerEmail, managerName,
        });
      }
    }
    if (!clean(rawEmployee)) continue;
    const name = clean(rawEmployee);
    entries.push({ name, department, managerEmail, managerName, sourceRow: i + 1 });
  }

  const managersByDepartment = new Map();
  for (const manager of managers.values()) {
    const id = key(manager.department);
    if (!managersByDepartment.has(id)) managersByDepartment.set(id, new Set());
    managersByDepartment.get(id).add(manager.managerEmail || 'name:' + key(manager.managerName));
  }

  // A person can belong to a functional department and to Juhtkond.
  // A leadership membership is a reporting cohort, not a second primary
  // team: keeping both as primary would double count Outlook/Teams events.
  // Contradictory non-leadership memberships must be reviewed by HR.
  const byName = new Map();
  for (const entry of entries) {
    const id = key(entry.name);
    if (!byName.has(id)) byName.set(id, []);
    byName.get(id).push(entry);
  }

  const rows = [];
  for (const appearances of byName.values()) {
    const withDepartment = appearances.filter(entry => Boolean(entry.department));
    if (!withDepartment.length) {
      exceptions.push({ row: appearances[0].sourceRow, reason: 'unassigned_employee' });
      continue;
    }

    const distinctScopes = new Map();
    for (const entry of withDepartment) {
      const id = key(entry.department) + '|' +
        (entry.managerEmail || 'manager-name:' + key(entry.managerName));
      if (!distinctScopes.has(id)) distinctScopes.set(id, entry);
      else exceptions.push({ row: entry.sourceRow, reason: 'duplicate_same_scope' });
    }
    const scopes = [...distinctScopes.values()];
    const primaryScopes = scopes.filter(entry => key(entry.department) !== 'juhtkond');
    const leadershipScopes = scopes.filter(entry => key(entry.department) === 'juhtkond');

    let primary;
    let reportingGroups = [];
    if (primaryScopes.length === 1 && leadershipScopes.length <= 1) {
      primary = primaryScopes[0];
      if (leadershipScopes.length) reportingGroups = ['Juhtkond'];
    } else if (primaryScopes.length === 0 && leadershipScopes.length === 1) {
      primary = leadershipScopes[0];
    } else {
      exceptions.push({
        row: scopes[scopes.length - 1].sourceRow,
        reason: 'conflicting_employee_scope',
        name: appearances[0].name,
      });
      continue;
    }
    if (!primary.managerName || !primary.department) {
      exceptions.push({ row: primary.sourceRow, reason: 'manager_missing_department_or_name' });
      continue;
    }
    if (!primary.managerEmail) {
      exceptions.push({
        row: primary.sourceRow,
        reason: 'manager_email_missing_directory_resolution_required',
        managerName: primary.managerName,
      });
    }

    const separateManagerScopes =
      (managersByDepartment.get(key(primary.department))?.size || 0) > 1;
    const team = separateManagerScopes
      ? `${primary.department} / ${primary.managerName}`
      : primary.department;
    rows.push({
      Name: primary.name,
      Department: primary.department,
      Team: team,
      'Manager Email': primary.managerEmail,
      'Manager Name': primary.managerName,
      'Additional Reporting Groups': reportingGroups,
      'Roster Format': 'department_manager',
      'Source Row': primary.sourceRow,
    });
  }
  return { rows, managers: [...managers.values()], exceptions,
    observedEmployeeRows: entries.length, distinctNames: byName.size,
    headerRow: headerIndex + 1 };
}
