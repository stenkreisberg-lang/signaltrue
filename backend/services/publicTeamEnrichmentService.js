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
const MAX_PAGES = 4;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_TEXT_CHARS = 45_000;

const ROLE_RULES = [
  {
    pattern: /engineer|developer|software|devops|platform|infrastructure|data scientist|qa\b/i,
    team: 'Engineering',
    function: 'Engineering',
  },
  {
    pattern: /product manager|product owner|product lead|chief product/i,
    team: 'Product',
    function: 'Product',
  },
  {
    pattern: /designer|design lead|ux\b|ui\b|creative director/i,
    team: 'Design',
    function: 'Design',
  },
  {
    pattern: /marketing|content|brand|growth|communications|demand gen/i,
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
  $('script,style,noscript,svg,nav,footer,form').remove();
  const text = normalizeText($('body').text()).slice(0, MAX_TEXT_CHARS);
  const candidateLinks = [];
  $('a[href]').each((_, element) => {
    const label = normalizeText($(element).text());
    const href = $(element).attr('href');
    if (!href || !/(team|people|about|leadership|company|who-we-are)/i.test(`${label} ${href}`))
      return;
    try {
      const url = new URL(href, pageUrl);
      if (url.origin === new URL(pageUrl).origin && !candidateLinks.includes(url.toString())) {
        candidateLinks.push(url.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  });
  return { text, people, candidateLinks: candidateLinks.slice(0, MAX_PAGES - 1) };
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
  const completion = await getProvider().generate({
    prompt,
    model: process.env.TEAM_ENRICHMENT_MODEL || 'gpt-4o-mini',
    max_tokens: 1800,
  });
  return parseJsonObject(completion?.choices?.[0]?.message?.content);
}

export async function analyzePublicTeamStructure({ orgId, websiteUrl, linkedinUrl }) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found.');
  if (!websiteUrl) throw new Error('A public company homepage is required.');
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
  const first = await fetchPublicHtml(websiteUrl);
  const origin = first.url.origin;
  const firstPage = extractPublicTeamPage(first.html, first.url.toString());
  const pages = [{ url: first.url.toString(), ...firstPage }];
  for (const candidate of firstPage.candidateLinks.slice(0, MAX_PAGES - 1)) {
    try {
      const result = await fetchPublicHtml(candidate, origin);
      pages.push({ url: result.url.toString(), ...extractPublicTeamPage(result.html, result.url) });
    } catch (error) {
      console.warn(`[TeamEnrichment] Skipping ${candidate}: ${error.message}`);
    }
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

  const publicPeople = pages.flatMap((page) => page.people);
  const publicText = pages
    .map((page) => page.text)
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
  const namedPublicPeople = [...publicPeople, ...(aiResult?.publicPeople || [])];
  const publicPersonByName = new Map(
    namedPublicPeople
      .filter((person) => person.name)
      .map((person) => [normalizeName(person.name), person])
  );
  const sourceUrls = pages.map((page) => page.url);

  await TeamMappingSuggestion.deleteMany({ orgId, status: 'pending' });
  const suggestions = [];
  employees.forEach((employee, index) => {
    const publicMatch = publicPersonByName.get(normalizeName(employee.name));
    const rawAiMapping = aiMappings.get(`employee_${index + 1}`);
    const aiMapping =
      rawAiMapping?.teamName && Number(rawAiMapping.confidence || 0) >= 60
        ? rawAiMapping
        : null;
    const fallback = inferFromRole(employee.profile?.title, employee.profile?.department);
    const candidate =
      publicMatch?.teamName || publicMatch?.team
        ? {
            teamName: publicMatch.teamName || publicMatch.team,
            function:
              publicMatch.function ||
              inferFromRole(publicMatch.title, publicMatch.team)?.function ||
              'Other',
            confidence: Math.max(80, Number(publicMatch.confidence || 0)),
            reason: 'Name and role matched on the public company team page',
            sourceType: 'public_website',
            evidence: [normalizeText(`${publicMatch.name} - ${publicMatch.title || ''}`)],
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
  };
  await org.save();
  return TeamMappingSuggestion.find({ _id: { $in: created.map((item) => item._id) } })
    .populate('userId', 'name email profile.title profile.department')
    .sort({ confidence: -1 });
}

export async function applyTeamMappingSuggestions({ orgId, suggestionIds, decidedBy }) {
  const org = await Organization.findById(orgId).select('settings.minTeamSize').lean();
  const minimumTeamSize = Math.max(5, Number(org?.settings?.minTeamSize) || 5);
  const suggestions = await TeamMappingSuggestion.find({
    _id: { $in: suggestionIds },
    orgId,
    status: 'pending',
  });
  let applied = 0;
  for (const suggestion of suggestions) {
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
          sourceDepartment: 'Public website suggestion (admin approved)',
          autoCreatedFromDirectory: false,
        },
      });
    }
    const updated = await User.updateOne(
      { _id: suggestion.userId, orgId },
      { $set: { teamId: team._id } }
    );
    if (updated.modifiedCount > 0) applied++;
    suggestion.status = 'applied';
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
  return { applied, reviewed: suggestions.length };
}

export default { analyzePublicTeamStructure, applyTeamMappingSuggestions };
