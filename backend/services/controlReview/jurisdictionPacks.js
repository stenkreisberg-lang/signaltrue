/**
 * Jurisdiction packs.
 *
 * The verification product is the same everywhere: link an action to evidence
 * about whether work actually changed. What differs by country is only the
 * deployment paperwork — what a customer must tell workers, who they must
 * consult, and which authority's guidance they should check against.
 *
 * So jurisdiction is a pluggable pack, not a built-in assumption. A tenant with
 * no pack configured gets GLOBAL, which contains only obligations-shaped
 * prompts that hold anywhere. Nothing here is legal advice; every entry is
 * phrased as "confirm X was reviewed with your own adviser", because the
 * product must never assert that a customer is compliant.
 *
 * `counselReviewed` records whether a qualified adviser has actually checked a
 * pack's contents for that market. It ships false everywhere, and the UI says
 * so, because a checkpoint list that *looks* authoritative is more dangerous
 * than one that admits it is a starting point. Flip a pack to true only when
 * someone qualified has signed off on it, and record who and when.
 */

// GLOBAL is the floor. Every other pack inherits it.
const GLOBAL = {
  code: 'GLOBAL',
  label: 'No specific jurisdiction configured',
  region: 'Global',
  counselReviewed: false,
  checkpoints: [
    'Confirm workers are informed about what is collected, why, and who can see the output, before collection begins.',
    'Confirm the lawful basis and purpose limitation for processing work metadata have been reviewed with your own legal or privacy adviser.',
    'Confirm a privacy or data protection impact assessment has been completed for this processing.',
    'Confirm worker or employee-representative consultation has taken place according to local practice and any applicable agreement.',
    'Confirm retention periods, access controls and deletion arrangements match your own policy.',
  ],
};

/**
 * `inherits` chains a pack onto its parents, so an Estonian customer gets the
 * EU obligations and the global floor without those being restated per country.
 */
const PACKS = {
  GLOBAL,

  // ── Europe ───────────────────────────────────────────────────────────────
  EU: {
    code: 'EU',
    label: 'European Union (general)',
    region: 'Europe',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [
      'GDPR: confirm the lawful basis for processing employee work metadata, and that legitimate-interest balancing (where relied on) is documented.',
      'GDPR Article 35: confirm whether a Data Protection Impact Assessment is required for systematic monitoring of employees, and complete one where it is.',
      'Confirm works-council or employee-representative consultation and any co-determination requirements have been satisfied before activation.',
      'Framework Directive 89/391/EEC: confirm this sits inside the employer’s existing risk assessment, control and review duties rather than replacing them.',
      'Confirm your national data protection authority’s guidance on workplace monitoring has been reviewed.',
    ],
  },
  EE: {
    code: 'EE',
    label: 'Estonia',
    region: 'Europe',
    counselReviewed: false,
    inherits: ['EU'],
    checkpoints: [
      'Occupational Health and Safety Act (töötervishoiu ja tööohutuse seadus): confirm the employer’s risk analysis and its review obligations are documented, and that this evidence supports rather than replaces them.',
      'Confirm the Estonian Data Protection Inspectorate’s (Andmekaitse Inspektsioon) guidance on workplace monitoring has been reviewed.',
      'Confirm consultation with the working environment representative (töökeskkonnavolinik) or council before activation.',
    ],
  },
  FI: {
    code: 'FI',
    label: 'Finland',
    region: 'Europe',
    counselReviewed: false,
    inherits: ['EU'],
    checkpoints: [
      'Act on the Protection of Privacy in Working Life: confirm the co-operation procedure has been completed before any monitoring is introduced.',
    ],
  },
  DE: {
    code: 'DE',
    label: 'Germany',
    region: 'Europe',
    counselReviewed: false,
    inherits: ['EU'],
    checkpoints: [
      'Betriebsverfassungsgesetz §87: confirm works-council co-determination for technical systems capable of monitoring performance or behaviour has been obtained.',
    ],
  },
  UK: {
    code: 'UK',
    label: 'United Kingdom',
    region: 'Europe',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [
      'UK GDPR and the ICO employment practices guidance on monitoring workers: confirm the lawful basis, transparency and impact assessment have been reviewed.',
      'HSE Management Standards for work-related stress: confirm this evidence supports the employer’s existing risk assessment and review process.',
      'Confirm consultation with safety representatives or the recognised trade union where applicable.',
    ],
  },

  // ── Australia ────────────────────────────────────────────────────────────
  AU: {
    code: 'AU',
    label: 'Australia (general)',
    region: 'Australia',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [
      'Model WHS Regulations and the Safe Work Australia Code of Practice on managing psychosocial hazards: confirm this sits inside the employer’s identify / assess / control / review process.',
      'Confirm the duty to review control measures is documented, and that SignalTrue is positioned as review evidence rather than as the review itself.',
      'Confirm worker and Health and Safety Representative consultation obligations have been met.',
    ],
  },
  NSW: {
    code: 'NSW',
    label: 'New South Wales',
    region: 'Australia',
    counselReviewed: false,
    inherits: ['AU'],
    checkpoints: [
      'Workplace Surveillance Act 2005 (NSW): confirm written notice requirements and any surveillance policy obligations have been reviewed with the customer’s legal adviser.',
      'Confirm the notice period before computer surveillance commences has been considered.',
    ],
  },
  ACT: {
    code: 'ACT',
    label: 'Australian Capital Territory',
    region: 'Australia',
    counselReviewed: false,
    inherits: ['AU'],
    checkpoints: [
      'Workplace Privacy Act 2011 (ACT): confirm notice and consultation requirements have been reviewed with the customer’s legal adviser.',
    ],
  },
  VIC: {
    code: 'VIC',
    label: 'Victoria',
    region: 'Australia',
    counselReviewed: false,
    inherits: ['AU'],
    checkpoints: [
      'WorkSafe Victoria psychological health regulations: confirm the customer’s hazard identification, control and review process is documented.',
      'Confirm SignalTrue is positioned as review and verification evidence inside that process, not as a substitute for it.',
    ],
  },
  QLD: { code: 'QLD', label: 'Queensland', region: 'Australia', counselReviewed: false, inherits: ['AU'], checkpoints: [] },
  WA: { code: 'WA', label: 'Western Australia', region: 'Australia', counselReviewed: false, inherits: ['AU'], checkpoints: [] },
  SA: { code: 'SA', label: 'South Australia', region: 'Australia', counselReviewed: false, inherits: ['AU'], checkpoints: [] },
  TAS: { code: 'TAS', label: 'Tasmania', region: 'Australia', counselReviewed: false, inherits: ['AU'], checkpoints: [] },
  NT: { code: 'NT', label: 'Northern Territory', region: 'Australia', counselReviewed: false, inherits: ['AU'], checkpoints: [] },
  COMCARE: {
    code: 'COMCARE',
    label: 'Comcare scheme',
    region: 'Australia',
    counselReviewed: false,
    inherits: ['AU'],
    checkpoints: [
      'Comcare regulatory guidance on managing psychosocial hazards: confirm alignment with the customer’s existing WHS management system.',
    ],
  },

  // ── Other ────────────────────────────────────────────────────────────────
  US: {
    code: 'US',
    label: 'United States',
    region: 'Americas',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [
      'Confirm state electronic monitoring notice requirements (for example New York and Connecticut) have been reviewed with the customer’s counsel.',
      'Confirm applicable state privacy laws and any collective bargaining obligations have been reviewed.',
    ],
  },
  CA: {
    code: 'CA',
    label: 'Canada',
    region: 'Americas',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [
      'Confirm provincial electronic monitoring policy requirements (for example Ontario) and applicable privacy legislation have been reviewed.',
    ],
  },
  SG: { code: 'SG', label: 'Singapore', region: 'Asia Pacific', counselReviewed: false, inherits: ['GLOBAL'], checkpoints: [] },
  NZ: { code: 'NZ', label: 'New Zealand', region: 'Asia Pacific', counselReviewed: false, inherits: ['GLOBAL'], checkpoints: [] },
  OTHER: {
    code: 'OTHER',
    label: 'Other / not listed',
    region: 'Global',
    counselReviewed: false,
    inherits: ['GLOBAL'],
    checkpoints: [],
  },
};

export const DEFAULT_JURISDICTION = 'GLOBAL';

export function listJurisdictions() {
  return Object.values(PACKS)
    .map(({ code, label, region, counselReviewed }) => ({
      code,
      label,
      region,
      counselReviewed: counselReviewed === true,
    }))
    .sort((a, b) => a.region.localeCompare(b.region) || a.label.localeCompare(b.label));
}

/** Packs still awaiting sign-off by a qualified adviser for that market. */
export function unreviewedJurisdictions(codes = []) {
  return (codes.length ? codes : [DEFAULT_JURISDICTION])
    .map((code) => resolvePack(code))
    .filter((pack) => !pack.counselReviewed)
    .map((pack) => ({ code: pack.code, label: pack.label }));
}

export function isKnownJurisdiction(code) {
  return Boolean(PACKS[String(code || '').toUpperCase()]);
}

/**
 * Resolve one jurisdiction into its full checkpoint list, parents first.
 * An unrecognised code degrades to GLOBAL rather than erroring — a customer in
 * an unmodelled country still gets a usable deployment checklist.
 */
export function resolvePack(code) {
  const key = String(code || '').toUpperCase();
  const pack = PACKS[key] || PACKS[DEFAULT_JURISDICTION];

  const seen = new Set();
  const checkpoints = [];

  const walk = (current) => {
    if (!current || seen.has(current.code)) return;
    seen.add(current.code);
    for (const parent of current.inherits || []) walk(PACKS[parent]);
    for (const checkpoint of current.checkpoints || []) {
      checkpoints.push({ jurisdiction: current.code, checkpoint });
    }
  };

  walk(pack);

  // A pack inherits its parents' checkpoints, so it can only claim review if
  // every pack in the chain has been reviewed.
  const chainReviewed = [...seen].every((code) => PACKS[code]?.counselReviewed === true);

  return {
    code: pack.code,
    label: pack.label,
    region: pack.region,
    recognised: Boolean(PACKS[key]),
    counselReviewed: chainReviewed,
    checkpoints,
  };
}

/** Combined, de-duplicated checkpoints for every jurisdiction a tenant operates in. */
export function resolveCheckpoints(codes = []) {
  const list = codes.length ? codes : [DEFAULT_JURISDICTION];
  const seen = new Set();
  const combined = [];

  for (const code of list) {
    for (const entry of resolvePack(code).checkpoints) {
      const key = `${entry.jurisdiction}|${entry.checkpoint}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(entry);
    }
  }

  return combined;
}

export default {
  DEFAULT_JURISDICTION,
  listJurisdictions,
  isKnownJurisdiction,
  resolvePack,
  resolveCheckpoints,
  unreviewedJurisdictions,
};
