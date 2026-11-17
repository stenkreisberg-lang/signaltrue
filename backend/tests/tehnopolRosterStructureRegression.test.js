import { describe, expect, test } from '@jest/globals';
import { parseDepartmentManagerRosterSheet } from '../services/departmentManagerRosterService.js';

// Shape of Tehnopol's corrected 16 Nov workbook, with entirely fictional names.
// This protects group counts without storing customer employee identities in tests.
const people = (prefix, count) =>
  Array.from({ length: count }, (_, index) => `${prefix} Person${index + 1}`);

function groupRows(department, manager, members) {
  return members.map((member, index) =>
    index === 0 ? [department, manager, member] : [null, null, member]
  );
}

test('preserves the corrected 43-membership / 40-employee structure without counting leadership twice', () => {
  const leadership = people('Leadership', 7);
  const departments = [
    groupRows('Juhtkond', 'Agnes Example\\nagnes@example.test', leadership),
    groupRows('Äriarendusteenused', 'Martin Example\\nmartin@example.test', people('Business', 12)),
    groupRows('Tehnopol Kiirendi', 'Anne Example', people('Accelerator', 10)),
    groupRows('Kinnisvara ja haldus', 'Uku Example\\nuku@example.test', people('Property', 4)),
    groupRows('Turundus ja kommunikatsioon', 'Kristi Example\\nkristi@example.test', people('Marketing', 5)),
    groupRows('Administratsioon-finants', 'Agnes Example\\nagnes@example.test', leadership.slice(1, 4)),
    groupRows(null, 'Liis Example\\nliis@example.test', people('Administration', 2)),
  ];
  const grid = [['Osakond', 'Juht (tööemail)', 'Töötaja nimi'], ...departments.flat()];
  const parsed = parseDepartmentManagerRosterSheet(grid);
  expect(parsed.observedEmployeeRows).toBe(43);
  expect(parsed.distinctNames).toBe(40);
  expect(parsed.rows).toHaveLength(40);
  const leadershipMembership = parsed.rows.filter((r) =>
    r['Additional Reporting Groups'].includes('Juhtkond')
  );
  expect(leadershipMembership).toHaveLength(3);
  expect(parsed.rows.filter((r) => r.Department === 'Tehnopol Kiirendi')).toHaveLength(10);
  expect(parsed.rows.filter((r) => r.Department === 'Administratsioon-finants')).toHaveLength(5);
  expect(new Set(parsed.rows.filter((r) =>
    r.Department === 'Administratsioon-finants').map((r) => r.Team)).size).toBe(2);
  expect(parsed.exceptions.filter((e) => e.reason === 'conflicting_employee_scope')).toHaveLength(0);
  expect(parsed.exceptions.some((e) =>
    e.reason === 'manager_email_missing_directory_resolution_required')).toBe(true);
});
