export type JurisdictionGuide = {
  slug: 'australia' | 'uk' | 'estonia';
  name: string;
  shortName: string;
  regulator: string;
  headline: string;
  summary: string;
  reviewExpectation: string;
  practicalImplications: string[];
  evidenceSignal: string;
  sourceUrl: string;
  sourceLabel: string;
  secondarySourceUrl?: string;
  secondarySourceLabel?: string;
};

export const JURISDICTION_GUIDES: JurisdictionGuide[] = [
  {
    slug: 'australia',
    name: 'Australia',
    shortName: 'AU',
    regulator: 'Safe Work Australia',
    headline: 'Controls need to be reviewed for effectiveness, not merely implemented.',
    summary:
      'Safe Work Australia’s model Code of Practice treats review of control measures as the final step of psychosocial risk management. The review asks whether implemented controls are working as planned and whether they need to be modified or replaced.',
    reviewExpectation:
      'Review controls regularly and when consultation, workplace change, new hazards, or evidence suggests the existing control may not be effective.',
    practicalImplications: [
      'Define what should change before a control is introduced.',
      'Keep evidence that can show whether the control changed working conditions.',
      'Use worker consultation as part of the review, not as a substitute for evidence.',
      'Look for new or shifted risks after an intervention.',
    ],
    evidenceSignal:
      'SignalTrue can add a team-level before/after evidence layer around meeting demand, after-hours activity, focus availability and coordination patterns.',
    sourceUrl:
      'https://www.safeworkaustralia.gov.au/sites/default/files/2022-07/model_code_of_practice_-_managing_psychosocial_hazards_at_work.pdf',
    sourceLabel: 'Safe Work Australia — Managing psychosocial hazards at work, section 6',
  },
  {
    slug: 'uk',
    name: 'United Kingdom',
    shortName: 'UK',
    regulator: 'Health and Safety Executive',
    headline: 'HSE explicitly asks employers to evaluate whether stress controls are effective.',
    summary:
      'HSE’s Management Standards approach separates implementation from evaluation. Step 5 says organisations should monitor agreed actions, evaluate whether solutions are effective and decide what further action or data gathering is needed.',
    reviewExpectation:
      'Set a review method and timescale, ask employees whether the change improved the situation, and compare relevant data with the starting point.',
    practicalImplications: [
      'Record the action and the intended outcome.',
      'Choose evidence that can be compared with the pre-change position.',
      'Ask employees whether the change improved the situation.',
      'Reassess when work changes or the solution is not producing the expected effect.',
    ],
    evidenceSignal:
      'SignalTrue can complement worker voice with ongoing team-level work-pattern evidence so a review is not dependent on one survey point.',
    sourceUrl: 'https://www.hse.gov.uk/stress/standards/step5/',
    sourceLabel: 'HSE — Management Standards, Step 5: Monitor and review',
    secondarySourceUrl: 'https://www.hse.gov.uk/stress/standards/step4/index.htm',
    secondarySourceLabel: 'HSE — Step 4: Record findings and implement action plans',
  },
  {
    slug: 'estonia',
    name: 'Estonia',
    shortName: 'EE',
    regulator: 'Tööinspektsioon / Riigi Teataja',
    headline:
      'Psychosocial hazards belong in the risk analysis and preventive measures must be applied.',
    summary:
      'Estonian occupational health and safety law defines psychosocial hazards broadly across management, work organisation and the work environment. The employer must apply preventive measures, including adapting work organisation and optimising workload.',
    reviewExpectation:
      'Risk analysis should remain current with the real work environment. Tööinspektsioon has also stated in recent enforcement material that risk analysis is a continuous process and the adequacy of preventive measures should be evaluated after implementation.',
    practicalImplications: [
      'Map psychosocial hazards in the workplace risk analysis.',
      'Connect identified hazards with concrete preventive actions.',
      'Keep the analysis current when work, technology or organisation changes.',
      'Evaluate whether applied measures are sufficient in the real work environment.',
    ],
    evidenceSignal:
      'SignalTrue can provide additional team-level evidence about whether workload and coordination patterns changed after a preventive measure was introduced.',
    sourceUrl: 'https://www.riigiteataja.ee/akt/130012025010?leiaKehtiv=',
    sourceLabel: 'Riigi Teataja — Töötervishoiu ja tööohutuse seadus',
    secondarySourceUrl:
      'https://opendata.ti.ee/home/violationActs/b4268080-a035-4bde-8d24-95ecb69f3c02',
    secondarySourceLabel: 'Tööinspektsioon — 20 May 2026 enforcement record',
  },
];

export function findJurisdiction(slug?: string | null) {
  return JURISDICTION_GUIDES.find((item) => item.slug === slug);
}
