/**
 * Per-route title, description and crawler summary.
 *
 * The app renders entirely on the client, so a crawler that does not run
 * JavaScript sees only the shell in public/index.html — the same title and
 * description on every URL, and none of the page's copy. The build step in
 * scripts/generate-route-html.js writes one HTML file per route from this
 * manifest, so the served response carries the right metadata before any
 * JavaScript executes.
 *
 * Plain JS with no imports so both the build script (Node) and the app
 * (bundler) can read it.
 */

const SITE_URL = 'https://www.signaltrue.ai';
const SOCIAL_IMAGE = `${SITE_URL}/social-preview-v2.png`;

/**
 * `summary` is rendered inside <noscript> for agents that do not execute
 * JavaScript. It restates what the page says rather than adding anything a
 * visitor cannot see, so the two never diverge.
 */
const ROUTE_META = {
  '/': {
    title: 'Psychosocial Risk & Work-Pattern Early Warning | SignalTrue',
    description:
      'Continuous, team-level visibility into meeting load, focus time, after-hours work and manager coordination — without reading messages or monitoring individual productivity.',
    summary:
      'SignalTrue gives Health & Safety and operational leaders continuous, team-level visibility into changing work patterns: meeting load, focus time, after-hours activity and manager coordination. It uses work-pattern metadata, not message content, and does not score individual productivity.',
  },
  '/product': {
    title: 'Work-Pattern Signals for Psychosocial Risk | SignalTrue',
    description:
      'See persistent changes in how teams work across meetings, focus time, after-hours activity, manager capacity and collaboration. Team-level metadata, no message content.',
    summary:
      'SignalTrue compares each team’s current work patterns with its own baseline and surfaces persistent changes that may warrant investigation. A signal is evidence that something in the way work is organised has changed — not a diagnosis.',
  },
  '/how-it-works': {
    title: 'How SignalTrue Detects Persistent Work-Pattern Change',
    description:
      'Connect work-pattern metadata, establish each team’s baseline, detect persistent change, investigate with workers and review whether the work actually changed.',
    summary:
      'SignalTrue connects work-pattern metadata, learns each team’s normal rhythm, and looks for material and persistent change rather than reacting to a single busy week. Leaders investigate the cause alongside worker consultation, then review whether the pattern improved.',
  },
  '/solutions': {
    title: 'Work-Pattern Analytics for Health & Safety and Operations',
    description:
      'Work-pattern visibility for Health & Safety, operations, engineering and people leaders responsible for how work gets done.',
    summary:
      'Health & Safety teams add continuous work-pattern evidence between psychosocial risk assessments. Operations, engineering and people leaders use the same signals to see where workload and coordination pressure are building.',
  },
  '/trust': {
    title: 'Privacy-Preserving Team Work-Pattern Analytics | SignalTrue',
    description:
      'Metadata not content, team-level patterns, no individual productivity scoring and minimum group sizes. Work-pattern visibility without employee surveillance.',
    summary:
      'SignalTrue does not require message text, email bodies, documents or meeting recordings. Insights are team-level, with minimum group sizes, and there are no productivity ratings, leaderboards or employee rankings.',
  },
  '/sample-report': {
    title: 'Sample Work-Pattern Intelligence Report | SignalTrue',
    description:
      'See how a weekly work-pattern brief reports magnitude against baseline, how long a change has persisted, and what may be worth investigating.',
    summary:
      'A sample weekly brief showing meeting hours, focus time, after-hours activity and manager coordination load against the team’s established baseline, with how long each change has persisted and what may warrant investigation.',
  },
  '/australia-psychosocial-risk': {
    title: 'Psychosocial Risk Work-Pattern Monitoring Australia | SignalTrue',
    description:
      'Continuous team-level visibility into meeting load, focus time, after-hours work and manager capacity. Additional evidence for Australian psychosocial risk management without reading employee messages.',
    summary:
      'For Australian Health & Safety teams: continuous team-level visibility into digital work patterns between psychosocial risk assessments. SignalTrue does not determine that a psychosocial hazard exists and does not replace worker consultation or risk assessment.',
  },
  '/about': {
    title: 'About SignalTrue | Visibility Into the System of Work',
    description:
      'Many organisational problems are visible in working patterns before they are obvious in business outcomes. SignalTrue helps leaders see those changes earlier, without surveillance.',
    summary:
      'SignalTrue exists to make changes in the system of work visible — meeting structures, workload, focus time, management capacity and working hours — so leaders can investigate problems while they are still easier to address.',
  },
  '/pricing': {
    title: 'Pricing | SignalTrue Work-Pattern Early Warning',
    description:
      'Plans for Health & Safety, people and operational teams that need continuous visibility into workload and work-pattern change, and for leadership teams needing cross-team visibility.',
    summary:
      'Team Intelligence for Health & Safety, People and operational teams needing continuous visibility into work-pattern change. Leadership Intelligence for leadership teams needing cross-team visibility into workload and coordination pressure.',
  },
  '/contact': {
    title: 'Discuss a Pilot | SignalTrue',
    description:
      'Run a focused pilot to see whether continuous work-pattern evidence adds useful visibility alongside your existing psychosocial risk processes.',
    summary:
      'Contact SignalTrue to discuss a pilot with one team and see whether continuous work-pattern evidence adds useful visibility alongside existing psychosocial risk processes.',
  },
  '/resources': {
    title: 'Psychosocial Risk & Work Design Resources | SignalTrue',
    description:
      'Guidance on job demands, what happens between psychosocial risk assessments, reviewing whether an intervention worked, and work-pattern analytics without employee surveillance.',
    summary:
      'Articles on high job demands and digital work patterns, continuous visibility between psychosocial risk assessments, reviewing whether a workload intervention is working, and using operational data alongside worker consultation.',
  },
  '/privacy': {
    title: 'Privacy | SignalTrue',
    description:
      'How SignalTrue handles work-pattern metadata: no message content, team-level aggregation, minimum group sizes and no individual productivity scoring.',
    summary:
      'SignalTrue analyses work-pattern metadata at team level. No message content, no individual productivity scoring, no employee rankings.',
  },
  '/terms': {
    title: 'Terms | SignalTrue',
    description: 'Terms of service for SignalTrue work-pattern analytics.',
    summary: 'Terms of service for SignalTrue.',
  },
};

const DEFAULT_META = ROUTE_META['/'];

function getRouteMeta(path) {
  if (!path) return DEFAULT_META;
  const normalized = path !== '/' ? path.replace(/\/+$/, '') : '/';
  return ROUTE_META[normalized] || DEFAULT_META;
}

module.exports = { ROUTE_META, DEFAULT_META, SITE_URL, SOCIAL_IMAGE, getRouteMeta };
