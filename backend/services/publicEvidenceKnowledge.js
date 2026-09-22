const KNOWLEDGE = [
  {
    id: 'control-verification',
    keywords: [
      'control',
      'worked',
      'effective',
      'effectiveness',
      'verify',
      'verification',
      'before after',
      'review',
      'evidence',
    ],
    source: 'SignalTrue control-evidence method',
    section: 'Control verification',
    url: 'https://www.signaltrue.ai/did-the-control-work',
    content:
      'A useful control review separates completion from effectiveness. The review should define the expected effect, compare relevant evidence before and after implementation, check whether the effect was sustained, look for workload or risk migration, and validate interpretation with workers. SignalTrue treats team-level work-pattern evidence as one evidence stream. It does not determine legal compliance or replace worker consultation.',
  },
  {
    id: 'workload-migration',
    keywords: [
      'meeting',
      'workload',
      'migrate',
      'migration',
      'after hours',
      'focus',
      'chat',
      'email',
      'coordination',
    ],
    source: 'SignalTrue control-evidence method',
    section: 'Workload migration',
    url: 'https://www.signaltrue.ai/controls',
    content:
      'A workplace intervention can improve one visible metric while demand moves somewhere else. A meeting-reduction control should not be judged only by fewer meeting hours. The review should also check focus availability, after-hours activity, collaboration outside meetings, manager coordination load and worker feedback. SignalTrue describes this as possible workload migration, not proof of harm.',
  },
  {
    id: 'australia',
    keywords: [
      'australia',
      'australian',
      'safe work',
      'whs',
      'psychosocial hazard',
      'psychosocial hazards',
    ],
    source: 'Safe Work Australia',
    section: 'Model Code of Practice — review control measures',
    url: 'https://www.safeworkaustralia.gov.au/sites/default/files/2022-07/model_code_of_practice_-_managing_psychosocial_hazards_at_work.pdf',
    content:
      'Safe Work Australia’s model Code of Practice says the final step of risk management is to review the effectiveness of implemented control measures to ensure they are working as planned. If a control is not working effectively it must be reviewed and modified or replaced. Review is also required in specified circumstances including workplace change, new hazards and consultation indicating a review is necessary. SignalTrue can support a review with team-level before-and-after work-pattern evidence, but it does not determine compliance.',
  },
  {
    id: 'uk',
    keywords: ['united kingdom', 'uk', 'hse', 'management standards', 'work related stress'],
    source: 'UK Health and Safety Executive',
    section: 'Management Standards — Step 5: Monitor and review',
    url: 'https://www.hse.gov.uk/stress/standards/step5/',
    content:
      'HSE’s Management Standards Step 5 says organisations should monitor agreed actions, evaluate whether implemented solutions are effective and decide what further action or data gathering is needed. HSE also advises asking employees whether solutions improved the situation and comparing relevant data with the starting point. SignalTrue can complement worker voice with team-level work-pattern evidence.',
  },
  {
    id: 'estonia',
    keywords: [
      'estonia',
      'estonian',
      'eesti',
      'tööinspektsioon',
      'ttos',
      'psühhosotsiaal',
      'riskianalüüs',
    ],
    source: 'Riigi Teataja / Tööinspektsioon',
    section: 'Psychosocial hazards and risk analysis',
    url: 'https://www.riigiteataja.ee/akt/130012025010?leiaKehtiv=',
    content:
      'Estonian occupational health and safety law defines psychosocial hazards to include factors related to management, work organisation and the work environment that can affect mental or physical health, including work stress. Employers must apply preventive measures such as adapting work organisation and optimising workload. Recent Tööinspektsioon enforcement material also describes risk analysis as a continuous process and says the adequacy of preventive measures should be evaluated after implementation.',
  },
  {
    id: 'privacy',
    keywords: [
      'privacy',
      'monitor',
      'monitoring',
      'individual',
      'employee',
      'message content',
      'messages',
      'gdpr',
    ],
    source: 'SignalTrue responsible-use method',
    section: 'Privacy boundaries',
    url: 'https://www.signaltrue.ai/trust',
    content:
      'SignalTrue uses team-level work-pattern metadata and does not need message, email or chat content for its control-review evidence. It does not identify, diagnose or rank individual employees. A signal is an observation that should be interpreted with context and worker consultation.',
  },
];

export function getPublicEvidenceKnowledge(question = '') {
  const normalized = String(question).toLowerCase();
  const matched = KNOWLEDGE.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword))
  );

  const selected = matched.length ? matched.slice(0, 4) : [];

  return {
    hasRelevantResults: selected.length > 0,
    context: selected
      .map(
        (entry, index) =>
          `PUBLIC EVIDENCE SOURCE ${index + 1}
Source: ${entry.source}
Section: ${entry.section}
URL: ${entry.url}
Content: ${entry.content}`
      )
      .join('\n\n'),
    sources: selected.map((entry) => ({
      source: entry.source,
      section: entry.section,
      url: entry.url,
    })),
  };
}

export default { getPublicEvidenceKnowledge };
