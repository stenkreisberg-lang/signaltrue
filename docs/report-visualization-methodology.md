# SignalTrue report visualization and evidence rules

The weekly client report and authenticated dashboard share recorded source metrics.

## Historical comparison
- Daily observations represent **rolling seven-day** windows, never single-day totals.
- Complete UTC Monday–Sunday weeks are sampled on one consistent observation weekday for the historical series. No switching observation day between weeks.
- Missing sampled records stay blank. The current incomplete week remains separate and is not compared to completed weeks.
- Material change is a review cue, not a claim about employee wellbeing, engagement or productivity. It requires comparable consecutive observations and a separate preceding baseline.
- Different historical sources, coverage denominators and unverified meeting-instance counts cannot be silently mixed.

## Team privacy and context
- Team comparisons require at least eight distinct mapped actors in each displayed team-week, or a higher organization threshold.
- Active team membership must also meet the floor, as must any known source-directory size. Suppressed teams are not named, ranked or annotated.
- Team meeting-instance counts per represented actor are not individual attendance measurements.
- An intervention annotation is shown only on an eligible team's timeline. Private manager-coaching interventions are excluded.
- Stored before-and-after outcomes remain separate from the timeline metric unless measurement units and scope truly match.
- Human-entered context can explain changes but must never automatically dismiss a detected concern.

## Email and management workflow
- The weekly email uses inline-styled HTML tables with measured horizontal bar timelines, and a link to richer authenticated dashboard views.
- Missing channels are shown as unavailable, not zero or stable.
- Readers see the most important observed change, evidence limitations and the next operational action first.
- The report is not a psychosocial health diagnosis and no before/after correlation is proof of causal intervention effectiveness.

## Verification
- Production readiness requires backend unit tests, frontend build/browser flows and high-severity dependency audit.
- Check Gmail and Outlook rendering of a freshly generated report with actual coverage before claiming universal email-client compatibility.
