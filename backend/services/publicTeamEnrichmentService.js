import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import TeamMappingSuggestion from '../models/teamMappingSuggestion.js';
import getProvider from '../utils/aiProvider.js';

const ALLOWED_FUNCTIONS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'Operations',
  'Other',
];
const CATCH_ALL_TEAM = /^(unassigned|general|other|unknown|default|everyone|all)$/i;
const MAX_PAGES = 8;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_TEXT_CHARS = 45_000;
const TEAM_LINK_PATTERN = /(team|people|about|leadership|company|who-we-are|staff|meist|inimesed)/i;
const TEAM_PATHS = [
  '/team',
  '/our-team',
  '/people',
  '/leadership',
  '/about',
  '/about-us',
  '/company',
  '/who-we-are',
];
const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'yahoo.com',
  'proton.me',
  'protonmail.com',
]);
const GENERIC_PUBLIC_MAILBOXES = new Set([
  'admin',
  'careers',
  'contact',
  'hello',
  'info',
  'jobs',
  'marketing',
  'office',
  'sales',
  'support',
]);

const ROLE_RULES = [
  {
    pattern:
      /engineer|developer|software|devops|platform|infrastructure|data scientist|qa\b|\bit (?:and |& )?development\b/i,
    team: 'Engineering',
    function: 'Engineering',
  },
  {
    pattern: /product manager|product owner|product lead|chief product/i,
    team: 'Product',
    function: 'Product',
  },
  {
    pattern: /designer|design lead|ux\b|ui\b|creative director|art director/i,
    team: 'Design',
    function: 'Design',
  },
  {
    pattern:
      /marketing|content|brand|growth|communications|demand gen|copywriter|seo\b|digital strategist|digiturund/i,
    team: 'Marketing',
    function: 'Marketing',
  },
  {
    pattern: /sales|account executive|business development|revenue|commercial/i,
    team: 'Sales',
    function: 'Sales',
  },
  {
    pattern: /customer success|customer support|support specialist|helpdesk|service desk/i,
    team: 'Customer Success',
    function: 'Support',
  },
  {
    pattern: /operations|finance|people|human resources|hr\b|legal|chief of staff|administrat/i,
    team: 'Operations',
    function: 'Operations',
  },
];

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value) {
  return normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '');
}

export function suggestPublicWebsiteUrl({ websiteUrl, domain, email } = {}) {
  if (normalizeText(websiteUrl)) return normalizeText(websiteUrl);
  const emailDomain = normalizeText(email).split('@')[1]?.toLowerCase();
  const orgDomain = normalizeText(domain).toLowerCase().replace(/^@/, '');
  const candidate = orgDomain.includes('.') ? orgDomain : emailDomain;
  if (
    !candidate ||
    CONSUMER_EMAIL_DOMAINS.has(candidate) ||
    !/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(candidate)
  ) {
    return '';
  }
  return `https://${candidate}`;
}

function isPrivateIp(address) {
  if (!address) return true;
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

export async function validatePublicWebsiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid public company website URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP or HTTPS website URLs are supported.');
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error('Non-standard website ports are not supported.');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.includes('linkedin.com')
  ) {
    throw new Error(
      hostname.includes('linkedin.com')
        ? 'LinkedIn pages cannot be crawled. Add the company homepage and keep LinkedIn as a reference URL.'
        : 'The website must be publicly reachable.'
    );
  }
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Private network addresses are not allowed.');
  }
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('The website does not resolve to a public address.');
  }
  url.hash = '';
  return url;
}

async function fetchPublicHtml(inputUrl, origin, redirectsRemaining = 3) {
  const url = await validatePublicWebsiteUrl(inputUrl);
  if (origin && url.origin !== origin)
    throw new Error('Website links must remain on the same origin.');
  const response = await fetch(url, {
    redirect: 'manual',
    signal: globalThis.AbortSignal.timeout(10_000),
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'SignalTrue-TeamStructure/1.0 (+https://signaltrue.ai)',
    },
  });
  if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
    if (redirectsRemaining <= 0) throw new Error('Too many website redirects.');
    const redirected = new URL(response.headers.get('location'), url);
    return fetchPublicHtml(
      redirected.toString(),
      origin || redirected.origin,
      redirectsRemaining - 1
    );
  }
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('The website did not return an HTML page.');
  }
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_PAGE_BYTES) throw new Error('The website page is too large to analyze.');
  const html = await response.text();
  if (Buffer.byteLength(html) > MAX_PAGE_BYTES)
    throw new Error('The website page is too large to analyze.');
  return { url, html };
}

export function extractPublicTeamPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const people = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        if (types.includes('Person') && node.name) {
          people.push({
            name: normalizeText(node.name),
            title: normalizeText(node.jobTitle),
            team: normalizeText(node.department || node.worksFor?.department),
          });
        }
        Object.values(node).forEach((child) => {
          if (Array.isArray(child)) child.forEach(walk);
          else if (child && typeof child === 'object') walk(child);
        });
      };
      nodes.forEach(walk);
    } catch {
      // Invalid third-party JSON-LD should not prevent analysis of visible text.
    }
  });

  const candidateLinks = [];
  $('a[href]').each((_, element) => {
    const label = normalizeText($(element).text());
    const href = $(element).attr('href');
    if (!href || !TEAM_LINK_PATTERN.test(`${label} ${href}`)) return;
    try {
      const url = new URL(href, pageUrl);
      if (url.origin === new URL(pageUrl).origin && !candidateLinks.includes(url.toString())) {
        candidateLinks.push(url.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  });

  // Many company sites do not publish Person JSON-LD. Team cards commonly include
  // a mailto link, which gives us a reliable way to find the surrounding name/title block.
  $('a[href^="mailto:"]').each((_, element) => {
    const email = normalizeText($(element).attr('href'))
      .replace(/^mailto:/i, '')
      .split('?')[0];
    const mailbox = email.split('@')[0].toLowerCase();
    const localName = normalizeName(mailbox.replace(/[._-]+/g, ' '));
    if (!localName || GENERIC_PUBLIC_MAILBOXES.has(mailbox) || localName.split(' ').length < 2) {
      return;
    }

    let container = $(element);
    for (let depth = 0; depth < 7; depth += 1) {
      container = container.parent();
      if (!container.length) break;
      const tokens = container
        .find(
          'h1,h2,h3,h4,h5,h6,p,span,[class*="name"],[class*="nimi"],[class*="title"],[class*="role"],[class*="position"],[class*="perekonnanimi"],[class*="meta-data"]'
        )
        .map((__, token) => normalizeText($(token).text()))
        .get()
        .filter((value, index, values) => value && values.indexOf(value) === index);
      const name = tokens.find((value) => {
        const normalized = normalizeName(value);
        return normalized === localName || normalized.includes(localName);
      });
      if (!name) continue;
      const title = tokens.find((value) => {
        if (value === name || value.includes('@') || /https?:\/\//i.test(value)) return false;
        if (/^[+\d\s().-]{6,}$/.test(value)) return false;
        return value.length >= 2 && value.length <= 120;
      });
      if (title) {
        const inferred = inferFromRole(title, '');
        people.push({ name, title, team: inferred?.teamName || '' });
      }
      break;
    }
  });

  $('script,style,noscript,svg,nav,footer,form').remove();
  const text = normalizeText($('body').text()).slice(0, MAX_TEXT_CHARS);
  const deduplicatedPeople = [
    ...new Map(people.map((person) => [normalizeName(person.name), person])).values(),
  ];
  return {
    text,
    people: deduplicatedPeople,
    candidateLinks: candidateLinks.slice(0, MAX_PAGES * 2),
  };
}

function inferFromRole(title, department) {
  const source = normalizeText(`${department || ''} ${title || ''}`);
  if (!source) return null;
  const exactDepartment = normalizeText(department);
  if (exactDepartment && !/^(general|unassigned|other|unknown)$/i.test(exactDepartment)) {
    const rule = ROLE_RULES.find(({ pattern }) => pattern.test(exactDepartment));
    return {
      teamName: exactDepartment,
      function: rule?.function || 'Other',
      confidence: 94,
      reason: 'Microsoft/Entra directory department',
      sourceType: 'directory',
    };
  }
  const rule = ROLE_RULES.find(({ pattern }) => pattern.test(source));
  return rule
    ? {
        teamName: rule.team,
        function: rule.function,
        confidence: 72,
        reason: 'Job-title pattern matched to a standard function',
        sourceType: 'title_inference',
      }
    : null;
}

function parseJsonObject(value) {
  const cleaned = String(value || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function inferWithAI({ publicText, publicPeople, employees, existingTeams }) {
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return null;
  const anonymousEmployees = employees.map((employee, index) => ({
    employeeRef: `employee_${index + 1}`,
    title: normalizeText(employee.profile?.title),
    department: normalizeText(employee.profile?.department),
  }));
  const prompt = `You are mapping anonymous employee job profiles to company teams.
Return strict JSON only with this shape:
{"mappings":[{"employeeRef":"employee_1","teamName":"Engineering","function":"Engineering","confidence":0-100,"reason":"brief evidence-based reason"}],"publicPeople":[{"name":"Public Name","title":"Title","teamName":"Team","function":"Sales","confidence":0-100}]}

Rules:
- Allowed functions: ${ALLOWED_FUNCTIONS.join(', ')}.
- Prefer an existing team when the evidence supports it.
- Do not infer from gender, ethnicity, age, location, or any protected trait.
- Do not invent people or teams. Omit uncertain mappings below 60 confidence.
- Internal employees are anonymous; use employeeRef exactly.

Existing teams: ${JSON.stringify(existingTeams)}
Anonymous internal profiles: ${JSON.stringify(anonymousEmployees)}
Structured public people: ${JSON.stringify(publicPeople.slice(0, 100))}
Public company website text: ${publicText.slice(0, MAX_TEXT_CHARS)}`;
  const completion = await withTimeout(
    getProvider().generate({
      prompt,
      model: process.env.TEAM_ENRICHMENT_MODEL || 'gpt-4o-mini',
      max_tokens: 3000,
    }),
    25_000,
    'AI team inference timed out.'
  );
  return parseJsonObject(completion?.choices?.[0]?.message?.content);
}

export async function analyzePublicTeamStructure({ orgId, websiteUrl, linkedinUrl }) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found.');
  const representativeUser = await User.findOne({
    orgId,
    accountStatus: { $ne: 'inactive' },
  })
    .sort({ role: 1, createdAt: 1 })
    .select('email')
    .lean();
  const resolvedWebsiteUrl = suggestPublicWebsiteUrl({
    websiteUrl,
    domain: org.domain,
    email: representativeUser?.email,
  });
  if (!resolvedWebsiteUrl) {
    throw new Error(
      'Add the public company homepage. SignalTrue could not infer it from the organization or work-email domain.'
    );
  }
  if (linkedinUrl) {
    let referenceUrl;
    try {
      referenceUrl = new URL(linkedinUrl);
    } catch {
      throw new Error('Enter a valid LinkedIn company page URL or leave it blank.');
    }
    if (
      referenceUrl.protocol !== 'https:' ||
      !/(^|\.)linkedin\.com$/i.test(referenceUrl.hostname)
    ) {
      throw new Error('LinkedIn reference must be an HTTPS linkedin.com URL.');
    }
  }
  const first = await fetchPublicHtml(resolvedWebsiteUrl);
  const origin = first.url.origin;
  const firstPage = extractPublicTeamPage(first.html, first.url.toString());
  const pages = [{ url: first.url.toString(), ...firstPage }];
  const visited = new Set([first.url.toString()]);
  const queue = [
    ...firstPage.candidateLinks,
    ...TEAM_PATHS.map((path) => new URL(path, origin).toString()),
  ];
  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const batch = [];
    while (queue.length > 0 && batch.length < MAX_PAGES - pages.length) {
      const candidate = queue.shift();
      if (!candidate || visited.has(candidate)) continue;
      visited.add(candidate);
      batch.push(candidate);
    }
    if (batch.length === 0) break;
    const results = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const result = await fetchPublicHtml(candidate, origin);
          return {
            url: result.url.toString(),
            ...extractPublicTeamPage(result.html, result.url.toString()),
          };
        } catch (error) {
          console.warn(`[TeamEnrichment] Skipping ${candidate}: ${error.message}`);
          return null;
        }
      })
    );
    results.filter(Boolean).forEach((page) => {
      if (pages.some((existing) => existing.url === page.url)) return;
      pages.push(page);
      page.candidateLinks.forEach((candidate) => {
        if (!visited.has(candidate)) queue.push(candidate);
      });
    });
  }

  const teams = await Team.find({ orgId, isActive: { $ne: false } }).lean();
  const catchAllIds = teams
    .filter((team) => CATCH_ALL_TEAM.test(team.name))
    .map((team) => team._id);
  const employees = await User.find({
    orgId,
    accountStatus: { $ne: 'inactive' },
    $or: [{ teamId: null }, { teamId: { $exists: false } }, { teamId: { $in: catchAllIds } }],
  })
    .select('name profile.title profile.department teamId')
    .lean();

  const publicPeople = [
    ...new Map(
      pages
        .flatMap((page) => page.people)
        .filter((person) => person.name)
        .map((person) => [normalizeName(person.name), person])
    ).values(),
  ];
  const publicText = pages
    .map((page) => `Page: ${page.url}\n${page.text}`)
    .join('\n\n')
    .slice(0, MAX_TEXT_CHARS);
  const aiResult = await inferWithAI({
    publicText,
    publicPeople,
    employees,
    existingTeams: teams.map((team) => ({ name: team.name, function: team.metadata?.function })),
  }).catch((error) => {
    console.warn(`[TeamEnrichment] AI inference unavailable: ${error.message}`);
    return null;
  });
  const aiMappings = new Map(
    (aiResult?.mappings || []).map((mapping) => [mapping.employeeRef, mapping])
  );
  const namedPublicPeople = [
    ...new Map(
      [...(aiResult?.publicPeople || []), ...publicPeople]
        .filter((person) => person?.name)
        .map((person) => [normalizeName(person.name), person])
    ).values(),
  ];
  const publicPersonByName = new Map(
    publicPeople
      .filter((person) => person.name)
      .map((person) => [normalizeName(person.name), person])
  );
  const aiPublicPersonByName = new Map(
    (aiResult?.publicPeople || [])
      .filter((person) => person?.name)
      .map((person) => [normalizeName(person.name), person])
  );
  const sourceUrls = pages.map((page) => page.url);

  await TeamMappingSuggestion.deleteMany({ orgId, status: 'pending' });
  const suggestions = [];
  employees.forEach((employee, index) => {
    const publicMatch = publicPersonByName.get(normalizeName(employee.name));
    const aiPublicMatch = aiPublicPersonByName.get(normalizeName(employee.name));
    const rawAiMapping = aiMappings.get(`employee_${index + 1}`);
    const aiMapping =
      rawAiMapping?.teamName && Number(rawAiMapping.confidence || 0) >= 60 ? rawAiMapping : null;
    const fallback = inferFromRole(employee.profile?.title, employee.profile?.department);
    const candidate =
      publicMatch?.teamName || publicMatch?.team
        ? {
            teamName: publicMatch.teamName || publicMatch.team,
            function:
              publicMatch.function ||
              inferFromRole(publicMatch.title, publicMatch.team)?.function ||
              'Other',
            confidence: Math.max(92, Number(publicMatch.confidence || 0)),
            reason: 'Name and role matched on the public company team page',
            sourceType: 'public_website',
            evidence: [normalizeText(`${publicMatch.name} - ${publicMatch.title || ''}`)],
          }
        : aiPublicMatch?.teamName || aiPublicMatch?.team
          ? {
              teamName: aiPublicMatch.teamName || aiPublicMatch.team,
              function: ALLOWED_FUNCTIONS.includes(aiPublicMatch.function)
                ? aiPublicMatch.function
                : inferFromRole(aiPublicMatch.title, aiPublicMatch.team)?.function || 'Other',
              confidence: Math.min(84, Number(aiPublicMatch.confidence || 0)),
              reason: 'AI-interpreted public profile match; administrator review required',
              sourceType: 'ai_title_inference',
              evidence: [normalizeText(`${aiPublicMatch.name} - ${aiPublicMatch.title || ''}`)],
            }
          : aiMapping
            ? {
                teamName: normalizeText(aiMapping.teamName),
                function: ALLOWED_FUNCTIONS.includes(aiMapping.function)
                  ? aiMapping.function
                  : 'Other',
                confidence: Math.min(90, Number(aiMapping.confidence || 0)),
                reason: normalizeText(aiMapping.reason) || 'Anonymous job-title inference',
                sourceType: 'ai_title_inference',
                evidence: [normalizeText(employee.profile?.title || employee.profile?.department)],
              }
            : fallback;
    if (!candidate?.teamName || candidate.confidence < 60) return;
    suggestions.push({
      orgId,
      userId: employee._id,
      suggestedTeamName: candidate.teamName.slice(0, 120),
      suggestedFunction: ALLOWED_FUNCTIONS.includes(candidate.function)
        ? candidate.function
        : 'Other',
      confidence: Math.round(candidate.confidence),
      reason: candidate.reason,
      evidence: (candidate.evidence || [employee.profile?.title || employee.profile?.department])
        .filter(Boolean)
        .slice(0, 3),
      sourceUrls,
      sourceType: candidate.sourceType,
    });
  });

  const created = suggestions.length > 0 ? await TeamMappingSuggestion.insertMany(suggestions) : [];
  org.websiteUrl = first.url.toString();
  org.linkedinUrl = linkedinUrl ? normalizeText(linkedinUrl) : '';
  org.teamEnrichment = {
    status: created.length > 0 ? 'pending_review' : 'completed',
    lastAnalyzedAt: new Date(),
    lastSourceUrls: sourceUrls,
    lastError: null,
    lastPagesScanned: pages.length,
    lastPeopleFound: namedPublicPeople.length,
    lastEmployeesConsidered: employees.length,
    lastAutoApplied: 0,
    lastPendingReview: created.length,
    lastUnmatched: Math.max(0, employees.length - created.length),
  };
  await org.save();
  const createdSuggestions = await TeamMappingSuggestion.find({
    _id: { $in: created.map((item) => item._id) },
  })
    .populate('userId', 'name email profile.title profile.department')
    .sort({ confidence: -1 });
  return {
    suggestions: createdSuggestions,
    scan: {
      pagesScanned: pages.length,
      peopleFound: namedPublicPeople.length,
      employeesConsidered: employees.length,
      suggestionsCreated: created.length,
      unmatched: Math.max(0, employees.length - created.length),
      sourceUrls,
    },
  };
}

export async function applyTeamMappingSuggestions({
  orgId,
  suggestionIds,
  decidedBy,
  decisionMode = 'admin_approved',
}) {
  const org = await Organization.findById(orgId).select('settings.minTeamSize').lean();
  const minimumTeamSize = Math.max(5, Number(org?.settings?.minTeamSize) || 5);
  const catchAllTeams = await Team.find({ orgId, name: CATCH_ALL_TEAM }).select('_id').lean();
  const unassignedFilter = {
    orgId,
    accountStatus: { $ne: 'inactive' },
    $or: [
      { teamId: null },
      { teamId: { $exists: false } },
      { teamId: { $in: catchAllTeams.map((team) => team._id) } },
    ],
  };
  const suggestions = await TeamMappingSuggestion.find({
    _id: { $in: suggestionIds },
    orgId,
    status: 'pending',
  });
  let applied = 0;
  let skipped = 0;
  for (const suggestion of suggestions) {
    const userIsStillUnassigned = await User.exists({
      _id: suggestion.userId,
      ...unassignedFilter,
    });
    if (!userIsStillUnassigned) {
      skipped++;
      suggestion.status = 'skipped';
      suggestion.decisionMode = decisionMode;
      suggestion.decisionNote = 'User already had a named team when the suggestion was applied.';
      suggestion.decidedBy = decidedBy;
      suggestion.decidedAt = new Date();
      await suggestion.save();
      continue;
    }
    let team = await Team.findOne({
      orgId,
      name: {
        $regex: `^${suggestion.suggestedTeamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      },
    });
    if (!team) {
      team = await Team.create({
        orgId,
        name: suggestion.suggestedTeamName,
        metadata: {
          function: suggestion.suggestedFunction,
          sourceDepartment:
            decisionMode === 'auto_high_confidence'
              ? 'Public website match (automatic, high confidence)'
              : 'Public website suggestion (admin approved)',
          autoCreatedFromDirectory: false,
        },
      });
    }
    const updated = await User.updateOne(
      { _id: suggestion.userId, ...unassignedFilter },
      { $set: { teamId: team._id } }
    );
    if (updated.modifiedCount > 0) {
      applied++;
      suggestion.status = 'applied';
      suggestion.decisionNote = 'Assigned while the user was still in an unassigned team bucket.';
    } else {
      skipped++;
      suggestion.status = 'skipped';
      suggestion.decisionNote =
        'Assignment was skipped because the user team changed concurrently.';
    }
    suggestion.decisionMode = decisionMode;
    suggestion.decidedBy = decidedBy;
    suggestion.decidedAt = new Date();
    await suggestion.save();
  }

  if (suggestions.length > 0) {
    const affectedTeams = await Team.find({ orgId });
    for (const team of affectedTeams) {
      const actualSize = await User.countDocuments({
        orgId,
        teamId: team._id,
        accountStatus: { $ne: 'inactive' },
      });
      if (!team.metadata) team.metadata = {};
      team.metadata.actualSize = actualSize;
      team.metadata.sizeBand =
        actualSize <= 5
          ? '1-5'
          : actualSize <= 10
            ? '6-10'
            : actualSize <= 20
              ? '11-20'
              : actualSize <= 50
                ? '21-50'
                : '50+';
      team.analyticsEnabled = actualSize >= minimumTeamSize;
      team.privacyGateFiredAt = actualSize >= minimumTeamSize ? null : new Date();
      await team.save();
    }
  }
  const pending = await TeamMappingSuggestion.countDocuments({ orgId, status: 'pending' });
  await Organization.updateOne(
    { _id: orgId },
    { $set: { 'teamEnrichment.status': pending > 0 ? 'pending_review' : 'completed' } }
  );
  return { applied, skipped, reviewed: suggestions.length };
}

export function shouldAutoApplyTeamSuggestion(suggestion) {
  return (
    Number(suggestion?.confidence || 0) >= 85 &&
    ['directory', 'public_website'].includes(suggestion?.sourceType)
  );
}

export async function analyzeAndApplyPublicTeamStructure({
  orgId,
  websiteUrl,
  linkedinUrl,
  decidedBy,
}) {
  const analysis = await analyzePublicTeamStructure({ orgId, websiteUrl, linkedinUrl });
  const automaticIds = analysis.suggestions
    .filter(shouldAutoApplyTeamSuggestion)
    .map((suggestion) => suggestion._id);
  const automaticResult =
    automaticIds.length > 0
      ? await applyTeamMappingSuggestions({
          orgId,
          suggestionIds: automaticIds,
          decidedBy,
          decisionMode: 'auto_high_confidence',
        })
      : { applied: 0, skipped: 0, reviewed: 0 };
  const pendingSuggestions = await TeamMappingSuggestion.find({ orgId, status: 'pending' })
    .populate('userId', 'name email profile.title profile.department')
    .sort({ confidence: -1 });
  const summary = {
    ...analysis.scan,
    autoApplied: automaticResult.applied,
    skipped: automaticResult.skipped,
    pendingReview: pendingSuggestions.length,
  };
  await Organization.updateOne(
    { _id: orgId },
    {
      $set: {
        'teamEnrichment.status': pendingSuggestions.length > 0 ? 'pending_review' : 'completed',
        'teamEnrichment.lastAutoApplied': summary.autoApplied,
        'teamEnrichment.lastPendingReview': summary.pendingReview,
        'teamEnrichment.lastUnmatched': summary.unmatched,
      },
    }
  );
  return { suggestions: pendingSuggestions, summary };
}

export default {
  analyzePublicTeamStructure,
  analyzeAndApplyPublicTeamStructure,
  applyTeamMappingSuggestions,
};
