export type ControlLibraryEntry = {
  hazardSlug: string;
  hazard: string;
  controlSlug: string;
  control: string;
  intent: string;
  expectedEffect: string;
  indicators: string[];
  evidenceNeeded: string[];
  migrationRisks: string[];
  consultationQuestions: string[];
  reviewTiming: string;
};

export const CONTROL_LIBRARY: ControlLibraryEntry[] = [
  {
    hazardSlug: 'excessive-workload',
    hazard: 'Excessive workload',
    controlSlug: 'reduce-recurring-meetings',
    control: 'Reduce recurring meetings',
    intent: 'Remove avoidable coordination demand and create more usable focus capacity.',
    expectedEffect:
      'Meeting hours and back-to-back density should fall without equivalent demand reappearing in messages, after-hours work, or another role.',
    indicators: [
      'Meeting hours per person',
      'Back-to-back meeting rate',
      'Uninterrupted calendar availability',
      'After-hours activity',
      'Collaboration volume outside meetings',
    ],
    evidenceNeeded: [
      'A pre-change baseline covering several normal work weeks',
      'A clearly dated implementation point',
      'A comparable post-change period',
      'A later sustainability check',
      'Worker feedback on whether demand actually reduced',
    ],
    migrationRisks: [
      'Coordination moves into chat or email',
      'Work is pushed into evenings',
      'Managers absorb more coordination work',
      'Decision delays increase because forums disappeared',
    ],
    consultationQuestions: [
      'What work disappeared after the meeting change?',
      'What work moved somewhere else?',
      'Are decisions faster, slower, or unchanged?',
      'Did the change create more uninterrupted time that people can actually use?',
    ],
    reviewTiming: 'Initial review after 3–6 weeks; sustainability check after 8–12 weeks.',
  },
  {
    hazardSlug: 'excessive-workload',
    hazard: 'Excessive workload',
    controlSlug: 'reprioritise-work',
    control: 'Reprioritise or remove lower-value work',
    intent:
      'Reduce total demand rather than asking people to absorb the same workload differently.',
    expectedEffect:
      'Work intensity, after-hours activity, and coordination pressure should reduce while delivery on the highest-priority work remains stable.',
    indicators: [
      'After-hours activity',
      'Meeting and coordination load',
      'Focus availability',
      'Response latency pressure',
      'Delivery context recorded by the organisation',
    ],
    evidenceNeeded: [
      'Documented work removed, delayed, or descoped',
      'Baseline work-pattern evidence',
      'Post-change comparison',
      'Worker validation that demand genuinely changed',
      'A later check that removed work was not quietly reintroduced',
    ],
    migrationRisks: [
      'Work is renamed rather than removed',
      'Lower-priority work continues informally',
      'Pressure shifts to another team',
      'Managers carry hidden coordination work',
    ],
    consultationQuestions: [
      'Which tasks actually stopped?',
      'Which tasks still happen despite being deprioritised?',
      'Where has work pressure moved?',
      'Do people have permission to leave lower-priority work undone?',
    ],
    reviewTiming: 'Review after one delivery cycle and again after the next planning cycle.',
  },
  {
    hazardSlug: 'excessive-workload',
    hazard: 'Excessive workload',
    controlSlug: 'add-capacity',
    control: 'Add staffing or temporary capacity',
    intent: 'Reduce sustained demand per person by increasing available capacity.',
    expectedEffect:
      'After an onboarding period, workload concentration and after-hours pressure should fall rather than simply creating more coordination overhead.',
    indicators: [
      'After-hours activity',
      'Manager coordination load',
      'Meeting demand',
      'Collaboration spread',
      'Focus availability',
    ],
    evidenceNeeded: [
      'Baseline before extra capacity arrives',
      'Onboarding period identified separately',
      'Post-onboarding comparison',
      'Worker feedback on whether demand per person changed',
      'Check for added coordination overhead',
    ],
    migrationRisks: [
      'Managers gain more coordination work',
      'New capacity creates onboarding load before it helps',
      'Work expands to fill the added capacity',
      'Critical tasks remain concentrated with the same people',
    ],
    consultationQuestions: [
      'Which work is now genuinely shared?',
      'Has onboarding created extra pressure elsewhere?',
      'Are critical dependencies still concentrated?',
      'Did new capacity change deadlines or only increase output expectations?',
    ],
    reviewTiming:
      'Separate onboarding effects from the review; assess 6–12 weeks after effective capacity is available.',
  },
  {
    hazardSlug: 'low-job-control',
    hazard: 'Low job control',
    controlSlug: 'increase-decision-autonomy',
    control: 'Increase decision autonomy',
    intent: 'Move appropriate decisions closer to the people doing the work.',
    expectedEffect:
      'Escalation loops and approval delays should reduce while decision quality and role clarity remain acceptable.',
    indicators: [
      'Coordination spread',
      'Response latency around approvals',
      'Meeting load tied to decision forums',
      'Manager involvement patterns',
      'Worker feedback on practical autonomy',
    ],
    evidenceNeeded: [
      'Defined decisions that changed ownership',
      'Baseline approval and coordination patterns',
      'Post-change evidence',
      'Examples of decisions now made at team level',
      'Worker and manager validation',
    ],
    migrationRisks: [
      'Accountability becomes unclear',
      'Managers continue to override decisions informally',
      'People receive responsibility without authority',
      'More autonomy creates duplicated decisions between teams',
    ],
    consultationQuestions: [
      'Which decisions can you now make without escalation?',
      'Which decisions still come back to management?',
      'Where is accountability unclear?',
      'Did autonomy reduce delay or simply move risk downward?',
    ],
    reviewTiming: 'Review after 4–8 weeks and after one material decision cycle.',
  },
  {
    hazardSlug: 'poor-support',
    hazard: 'Poor support',
    controlSlug: 'protect-manager-capacity',
    control: 'Protect manager capacity for support',
    intent: 'Create enough manager capacity for timely guidance, escalation, and worker support.',
    expectedEffect:
      'Manager overload and delayed responses should fall while team access to useful support improves.',
    indicators: [
      'Manager meeting load',
      'Manager after-hours activity',
      'Response latency',
      'Back-to-back meeting density',
      'Team collaboration concentration around the manager',
    ],
    evidenceNeeded: [
      'Baseline manager load',
      'Specific work removed or delegated',
      'Post-change manager capacity evidence',
      'Worker feedback on access to support',
      'Check that work did not move to another overloaded role',
    ],
    migrationRisks: [
      'Administrative work shifts to team members',
      'Support becomes scheduled but less useful',
      'Another manager absorbs the same load',
      'Availability improves while decision authority does not',
    ],
    consultationQuestions: [
      'Can people get useful support when they need it?',
      'What work was removed from managers?',
      'Has support improved or only become more scheduled?',
      'Who picked up the work managers stopped doing?',
    ],
    reviewTiming: 'Review after 4–6 weeks and again after a normal peak period.',
  },
  {
    hazardSlug: 'poor-role-clarity',
    hazard: 'Poor role clarity',
    controlSlug: 'clarify-decision-rights',
    control: 'Clarify decision rights and ownership',
    intent: 'Reduce duplicated work, escalation loops, and uncertainty about who decides what.',
    expectedEffect:
      'Coordination effort and repeated handoffs should reduce while decision latency improves.',
    indicators: [
      'Collaboration spread',
      'Repeated meeting participation',
      'Response latency',
      'Manager involvement in routine work',
      'Cross-team coordination load',
    ],
    evidenceNeeded: [
      'Documented decision-right changes',
      'Baseline examples of ambiguity',
      'Before/after coordination evidence',
      'Worker examples of clearer ownership',
      'Review of unresolved boundary cases',
    ],
    migrationRisks: [
      'Documentation changes but behaviour does not',
      'Decisions become faster but less inclusive',
      'New boundaries create cross-team friction',
      'Managers remain informal approval points',
    ],
    consultationQuestions: [
      'Which decisions are clearer now?',
      'Where do people still ask who owns the decision?',
      'Did any new bottleneck appear?',
      'Are escalation paths clearer when ownership is genuinely shared?',
    ],
    reviewTiming: 'Review after 4–8 weeks and after at least one cross-team decision cycle.',
  },
  {
    hazardSlug: 'after-hours-work',
    hazard: 'After-hours work',
    controlSlug: 'right-to-disconnect-boundaries',
    control: 'Introduce practical right-to-disconnect boundaries',
    intent: 'Reduce unnecessary work demand outside expected working time.',
    expectedEffect:
      'After-hours activity should fall without deadlines compressing into earlier hours or urgent work becoming harder to escalate.',
    indicators: [
      'After-hours activity',
      'Early-morning activity',
      'Response latency expectations',
      'Meeting start and end times',
      'Message timing distribution',
    ],
    evidenceNeeded: [
      'Baseline outside-hours activity',
      'Documented boundary or escalation rules',
      'Post-change comparison',
      'Worker feedback on whether pressure changed',
      'Check for temporal displacement into early mornings or compressed days',
    ],
    migrationRisks: [
      'Work shifts to early mornings',
      'Daytime intensity increases',
      'Managers continue signalling implicit urgency',
      'People delay sending messages but still work offline',
    ],
    consultationQuestions: [
      'Has actual work changed or only message timing?',
      'Do people feel able to leave non-urgent work until the next day?',
      'Has daytime intensity increased?',
      'Are urgent exceptions clear and credible?',
    ],
    reviewTiming: 'Review after 4–6 weeks and across at least one high-demand period.',
  },
  {
    hazardSlug: 'meeting-overload',
    hazard: 'Meeting overload',
    controlSlug: 'meeting-free-focus-blocks',
    control: 'Create protected meeting-free focus blocks',
    intent: 'Increase usable uninterrupted time for concentrated work.',
    expectedEffect:
      'Protected focus availability should increase without meetings moving to less suitable hours or chat interruptions increasing sharply.',
    indicators: [
      'Uninterrupted calendar availability',
      'Meeting density',
      'Back-to-back rate',
      'After-hours activity',
      'Collaboration activity during focus blocks',
    ],
    evidenceNeeded: [
      'Baseline focus availability',
      'Defined protected hours or days',
      'Post-change comparison',
      'Check for meeting displacement',
      'Worker feedback on whether protected time is actually usable',
    ],
    migrationRisks: [
      'Meetings move to mornings or evenings',
      'Chat interruptions replace meetings',
      'Work piles up immediately before or after protected blocks',
      'Customer-facing teams cannot use the same pattern',
    ],
    consultationQuestions: [
      'Can people actually protect the focus block?',
      'Where did displaced meetings go?',
      'Did interruptions move into chat?',
      'Which roles need a different version of the control?',
    ],
    reviewTiming: 'Review after 3–4 weeks and again after a peak workload period.',
  },
  {
    hazardSlug: 'remote-isolation',
    hazard: 'Remote or hybrid isolation',
    controlSlug: 'team-contact-rhythm',
    control: 'Create a purposeful team contact rhythm',
    intent:
      'Improve access to useful connection and support without adding unnecessary meeting load.',
    expectedEffect:
      'Collaboration should become more evenly distributed and support access should improve without creating a new meeting burden.',
    indicators: [
      'Collaboration spread',
      'Meeting load',
      'Manager concentration',
      'Response latency',
      'Worker feedback on connection quality',
    ],
    evidenceNeeded: [
      'Baseline collaboration pattern',
      'Defined purpose for new contact points',
      'Post-change comparison',
      'Worker feedback on usefulness',
      'Check for unnecessary meeting growth',
    ],
    migrationRisks: [
      'Connection is treated as more meetings',
      'Introverted or distributed workers experience extra interruption',
      'Manager dependency increases',
      'Informal contact excludes some people',
    ],
    consultationQuestions: [
      'Which contact points are genuinely useful?',
      'Who is still missing from the flow of information?',
      'Has support access improved?',
      'Did the intervention create more meeting burden than value?',
    ],
    reviewTiming: 'Review after 4–6 weeks and after one significant remote/hybrid work cycle.',
  },
  {
    hazardSlug: 'organisational-change',
    hazard: 'Poorly managed organisational change',
    controlSlug: 'staged-rollout',
    control: 'Use a staged rollout with feedback checkpoints',
    intent: 'Reduce uncertainty and identify emerging work-design problems before full rollout.',
    expectedEffect:
      'Coordination disruption and after-hours pressure should stabilise as each stage progresses, with issues resolved before expansion.',
    indicators: [
      'Meeting load',
      'After-hours activity',
      'Response latency',
      'Collaboration spread',
      'Manager load',
    ],
    evidenceNeeded: [
      'Pre-change baseline',
      'Rollout stages and dates',
      'Evidence after each stage',
      'Worker consultation at each checkpoint',
      'Decision record for whether to continue, adapt, or pause',
    ],
    migrationRisks: [
      'Pilot teams absorb disproportionate change work',
      'Temporary workarounds become permanent',
      'Support teams carry hidden implementation load',
      'Pressure appears only after scale increases',
    ],
    consultationQuestions: [
      'What new work did the change create?',
      'Which temporary workaround is becoming permanent?',
      'Where is support load accumulating?',
      'What evidence would justify changing the rollout plan?',
    ],
    reviewTiming: 'Review at every rollout gate, not only after full implementation.',
  },
  {
    hazardSlug: 'staffing-gaps',
    hazard: 'Staffing gaps or vacancies',
    controlSlug: 'temporary-cover',
    control: 'Introduce temporary workload cover',
    intent:
      'Prevent vacancy-related demand from becoming sustained overload for the remaining team.',
    expectedEffect:
      'After-hours work, meeting concentration, and dependency on key people should reduce during the vacancy period.',
    indicators: [
      'After-hours activity',
      'Meeting concentration',
      'Collaboration concentration',
      'Manager load',
      'Focus availability',
    ],
    evidenceNeeded: [
      'Vacancy start date and affected work',
      'Baseline or early-vacancy evidence',
      'Documented cover arrangement',
      'Post-cover comparison',
      'Worker feedback on residual overload',
    ],
    migrationRisks: [
      'Cover exists on paper but not in available hours',
      'Remaining staff retain the hardest work',
      'Managers absorb the gap',
      'Temporary cover becomes a long-term operating model',
    ],
    consultationQuestions: [
      'Which work is genuinely covered?',
      'Which work still sits with the original team?',
      'Who is carrying the hidden coordination burden?',
      'What needs to stop until permanent capacity is restored?',
    ],
    reviewTiming:
      'Review within 2–4 weeks of introducing cover and monthly while the vacancy remains.',
  },
  {
    hazardSlug: 'conflict-and-friction',
    hazard: 'Conflict or organisational friction',
    controlSlug: 'clear-escalation-process',
    control: 'Create a clear escalation and resolution process',
    intent:
      'Reduce unresolved friction and repeated coordination loops by making escalation predictable.',
    expectedEffect:
      'Repeated cross-team coordination and manager escalation should reduce while unresolved cases move to clear owners.',
    indicators: [
      'Cross-team collaboration spread',
      'Manager involvement',
      'Repeated meeting patterns',
      'Response latency',
      'Worker feedback on escalation confidence',
    ],
    evidenceNeeded: [
      'Defined escalation path',
      'Baseline examples of unresolved friction',
      'Post-change cases and outcomes',
      'Worker feedback on fairness and usability',
      'Review of recurring unresolved patterns',
    ],
    migrationRisks: [
      'Every disagreement becomes a formal escalation',
      'Managers become the bottleneck',
      'Teams avoid difficult conversations',
      'Resolution speed improves while underlying work-design issues remain',
    ],
    consultationQuestions: [
      'Do people know when and how to escalate?',
      'Is the process trusted enough to use?',
      'Which issues keep recurring despite resolution?',
      'Is conflict caused by behaviour, unclear ownership, or the work system itself?',
    ],
    reviewTiming: 'Review after several real cases, then quarterly for recurring patterns.',
  },
];

export const HAZARDS = Array.from(
  new Map(CONTROL_LIBRARY.map((entry) => [entry.hazardSlug, entry.hazard])).entries()
).map(([slug, label]) => ({ slug, label }));

export function findControlEntry(hazardSlug?: string, controlSlug?: string) {
  return CONTROL_LIBRARY.find(
    (entry) => entry.hazardSlug === hazardSlug && entry.controlSlug === controlSlug
  );
}

export function controlPath(entry: ControlLibraryEntry) {
  return `/controls/${entry.hazardSlug}/${entry.controlSlug}`;
}
