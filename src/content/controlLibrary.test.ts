import { describe, expect, it } from 'vitest';
import { CONTROL_LIBRARY, HAZARDS } from './controlLibrary';

describe('control library hierarchy', () => {
  it('keeps hazards distinct from controls', () => {
    const poorSupport = HAZARDS.find((item) => item.slug === 'poor-support');
    const managerControl = CONTROL_LIBRARY.find(
      (item) =>
        item.hazardSlug === 'poor-support' && item.controlSlug === 'protect-manager-capacity'
    );

    expect(poorSupport?.label).toBe('Poor support');
    expect(managerControl?.control).toBe('Protect manager capacity for support');
    expect(HAZARDS.map((item) => item.label)).not.toContain(managerControl?.control);
  });

  it('derives one hazard label per hazard slug', () => {
    expect(new Set(HAZARDS.map((item) => item.slug)).size).toBe(HAZARDS.length);
  });
});
