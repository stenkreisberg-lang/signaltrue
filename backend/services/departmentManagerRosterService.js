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
      if (!department || !managerEmail) {
        exceptions.push({ row: i + 1, reason: 'manager_missing_department_or_email' });
      } else {
        managers.set(key(department) + '|' + managerEmail, {
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
    managersByDepartment.get(id).add(manager.managerEmail);
  }

  // The opening unlabelled names are not an organisation unit. If they also
  // appear in a named department, use only the explicit assignment.
  const byName = new Map();
  for (const entry of entries) {
    const id = key(entry.name);
    const previous = byName.get(id);
    if (!previous) { byName.set(id, entry); continue; }
    if (!previous.department && entry.department) {
      byName.set(id, entry);
    } else if (previous.department && !entry.department) {
      // Preserve explicit assignment over the introductory list.
    } else if (key(previous.department) === key(entry.department) &&
               previous.managerEmail === entry.managerEmail) {
      exceptions.push({ row: entry.sourceRow, reason: 'duplicate_same_scope' });
    } else {
      byName.set(id, { ...entry, conflict: true });
      exceptions.push({ row: entry.sourceRow, reason: 'conflicting_employee_scope' });
    }
  }

  const rows = [];
  for (const entry of byName.values()) {
    if (entry.conflict) continue;
    if (!entry.department || !entry.managerEmail) {
      exceptions.push({ row: entry.sourceRow, reason: 'unassigned_employee' });
      continue;
    }
    const separateManagerScopes =
      (managersByDepartment.get(key(entry.department))?.size || 0) > 1;
    const team = separateManagerScopes
      ? `${entry.department} / ${entry.managerName}`
      : entry.department;
    rows.push({
      Name: entry.name,
      Department: entry.department,
      Team: team,
      'Manager Email': entry.managerEmail,
      'Roster Format': 'department_manager',
      'Source Row': entry.sourceRow,
    });
  }
  return { rows, managers: [...managers.values()], exceptions,
    observedEmployeeRows: entries.length, distinctNames: byName.size,
    headerRow: headerIndex + 1 };
}
