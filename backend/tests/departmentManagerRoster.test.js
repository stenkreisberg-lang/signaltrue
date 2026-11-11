import { describe, expect, test } from '@jest/globals';
import { parseDepartmentManagerRosterSheet } from '../services/departmentManagerRosterService.js';

const header = ['Osakond', 'Juht (tööemail)', 'Töötaja nimi'];

describe('hierarchical department and manager workbook', () => {
  test('recognises the real three-column format, de-duplicates preliminary names, and scopes a second manager', () => {
    const data = [
      [null, null, null], ['Organisatsiooni osakonnad', null, null],
      [null, null, null], header,
      [null, null, 'Katrin Näide'],
      [null, null, 'Kertu Näide'],
      ['Äriarendusteenused', 'Mari Juht\nmari@valid.test', 'Katrin Näide'],
      [null, null, 'Martin Näide'],
      ['Administratsioon-finants', 'Agnes Juht\nagnes@valid.test', 'Asta Näide'],
      [null, null, 'Liis Näide'],
      [null, 'Liis Näide\nliis@valid.test', 'Ailen Näide'],
      [null, null, 'Maila Näide'],
    ];
    const parsed = parseDepartmentManagerRosterSheet(data);
    expect(parsed.headerRow).toBe(4);
    expect(parsed.observedEmployeeRows).toBe(8);
    expect(parsed.distinctNames).toBe(7);
    expect(parsed.rows).toHaveLength(6);
    expect(parsed.rows.find(r => r.Name === 'Katrin Näide').Team).toBe('Äriarendusteenused');
    expect(parsed.rows.some(r => r.Name === 'Kertu Näide')).toBe(false);
    expect(parsed.rows.find(r => r.Name === 'Asta Näide').Team).toBe('Administratsioon-finants / Agnes Juht');
    expect(parsed.rows.find(r => r.Name === 'Ailen Näide').Team).toBe('Administratsioon-finants / Liis Näide');
    expect(parsed.managers).toHaveLength(3);
    expect(parsed.exceptions.some(e => e.reason === 'unassigned_employee')).toBe(true);
  });

  test('does not assign the same person to two contradictory named teams', () => {
    const parsed = parseDepartmentManagerRosterSheet([
      header,
      ['Sales', 'Manager A\na@valid.test', 'Same Name'],
      ['Operations', 'Manager B\nb@valid.test', 'Same Name'],
    ]);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.exceptions.some(e => e.reason === 'conflicting_employee_scope')).toBe(true);
  });

  test('declines unrelated Excel workbooks', () => {
    expect(parseDepartmentManagerRosterSheet([['Name','Email','Department'],['X','x@valid.test','Sales']])).toBeNull();
  });
});
