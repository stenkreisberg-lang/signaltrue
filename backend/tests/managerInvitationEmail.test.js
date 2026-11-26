import { expect, test } from '@jest/globals';
import { managerInvitationEmail } from '../services/managerInvitationEmail.js';

test('uses the preferred invitation language and keeps the team name and link as text', () => {
  const link = 'https://example.invalid/app/manager/invite#token=example&lang=et';
  const report = managerInvitationEmail('Research & Planning', link, 'et');
  expect(report.subject).toContain('kutse');
  expect(report.html).toContain('Research &amp; Planning');
  expect(report.html).toContain('#token=example&amp;lang=et');
  expect(report.html).toContain('seitse päeva');
  expect(managerInvitationEmail('Research', link, 'en').html).toContain('seven days');
});
