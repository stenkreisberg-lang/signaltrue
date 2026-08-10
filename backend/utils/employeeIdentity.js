const EMAIL_LOCAL_PART_BLOCKLIST = new Set([
  'admin',
  'administrator',
  'alerts',
  'billing',
  'bookings',
  'calendar',
  'contact',
  'devops',
  'do-not-reply',
  'donotreply',
  'finance',
  'hello',
  'help',
  'hostmaster',
  'hr',
  'info',
  'invoice',
  'it',
  'marketing',
  'meeting',
  'meetings',
  'newsletter',
  'no-reply',
  'noreply',
  'notifications',
  'postmaster',
  'reception',
  'room',
  'rooms',
  'sales',
  'security',
  'service',
  'support',
  'team',
  'teams',
  'webmaster',
  'zoom',
]);

const NON_EMPLOYEE_PATTERNS = [
  /\b(bot|robot|automation)\b/i,
  /\b(service|system|test|demo)\s+(account|user)\b/i,
  /\b(shared|group)\s+(mailbox|calendar|inbox)\b/i,
  /\b(resource|equipment)\s+(mailbox|account|calendar)?\b/i,
  /\b(meeting|conference|board|training|focus|zoom|teams)\s+room\b/i,
  /\b(room|rooms|printer|scanner|projector|reception|front desk)\b/i,
  /\b(no-?reply|do not reply|donotreply)\b/i,
];

const NAME_TOKEN_BLOCKLIST = new Set([
  'admin',
  'all',
  'bot',
  'calendar',
  'conference',
  'demo',
  'group',
  'meeting',
  'printer',
  'resource',
  'room',
  'scanner',
  'service',
  'shared',
  'system',
  'team',
  'test',
]);

function removeDiacritics(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeDirectoryString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return normalized || null;
}

export function normalizeEmail(value) {
  const normalized = normalizeDirectoryString(value)?.toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function cleanNameToken(value) {
  const token = normalizeDirectoryString(value)?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  if (!token || !/\p{L}/u.test(token)) return null;
  if (/\d/.test(token)) return null;
  const key = removeDiacritics(token).toLowerCase();
  if (NAME_TOKEN_BLOCKLIST.has(key)) return null;
  return token;
}

function parseFullName(value) {
  const normalized = normalizeDirectoryString(value);
  if (!normalized || normalized.includes('@')) return null;
  if (NON_EMPLOYEE_PATTERNS.some((pattern) => pattern.test(normalized))) return null;

  const tokens = normalized.split(/\s+/).map(cleanNameToken).filter(Boolean);

  if (tokens.length < 2) return null;

  const firstName = tokens[0];
  const lastName = tokens[tokens.length - 1];
  if (!firstName || !lastName || firstName.toLowerCase() === lastName.toLowerCase()) return null;

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
  };
}

export function resolveEmployeeNameIdentity(candidate = {}) {
  const explicitFirst = cleanNameToken(
    candidate.firstName || candidate.givenName || candidate.given_name
  );
  const explicitLast = cleanNameToken(
    candidate.lastName ||
      candidate.surname ||
      candidate.familyName ||
      candidate.family_name ||
      candidate.last_name
  );

  if (explicitFirst && explicitLast) {
    return {
      firstName: explicitFirst,
      lastName: explicitLast,
      name: `${explicitFirst} ${explicitLast}`,
    };
  }

  return parseFullName(
    candidate.displayName || candidate.fullName || candidate.name || candidate.realName
  );
}

function isLikelyServiceAccount(candidate, email) {
  if (
    candidate.deleted ||
    candidate.suspended ||
    candidate.isBot ||
    candidate.is_bot ||
    candidate.isAppUser ||
    candidate.is_app_user ||
    candidate.isResource ||
    candidate.resource ||
    candidate.accountEnabled === false
  ) {
    return true;
  }

  if (candidate.userType && String(candidate.userType).toLowerCase() !== 'member') {
    return true;
  }

  const localPart = email.split('@')[0];
  const localTokens = localPart
    .split(/[._+\-\d]+/)
    .map((part) => removeDiacritics(part).toLowerCase())
    .filter(Boolean);

  if (EMAIL_LOCAL_PART_BLOCKLIST.has(localPart)) return true;
  if (localTokens.some((token) => EMAIL_LOCAL_PART_BLOCKLIST.has(token))) return true;

  const combined = [
    candidate.name,
    candidate.displayName,
    candidate.fullName,
    candidate.realName,
    candidate.title,
    candidate.jobTitle,
    candidate.department,
    localPart.replace(/[._+-]+/g, ' '),
  ]
    .map(normalizeDirectoryString)
    .filter(Boolean)
    .join(' ');

  return NON_EMPLOYEE_PATTERNS.some((pattern) => pattern.test(combined));
}

export function classifyEmployeeCandidate(candidate = {}) {
  const email = normalizeEmail(
    candidate.email || candidate.mail || candidate.primaryEmail || candidate.userPrincipalName
  );

  if (!email) {
    return { ok: false, reason: 'missing_work_email' };
  }

  if (isLikelyServiceAccount(candidate, email)) {
    return { ok: false, email, reason: 'non_employee_resource_or_service_account' };
  }

  const identity = resolveEmployeeNameIdentity(candidate);
  if (!identity) {
    return { ok: false, email, reason: 'missing_first_name_or_surname' };
  }

  return {
    ok: true,
    email,
    ...identity,
  };
}

export function classifyUserDirectoryRecord(user) {
  return classifyEmployeeCandidate({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    displayName: user.name,
    title: user.profile?.title,
    department: user.profile?.department,
    isBot: user.profile?.isBot,
    isResource: user.profile?.isResource,
    source: user.source,
  });
}
