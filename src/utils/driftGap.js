/**
 * Compute team-vs-org gap labels for each drift family.
 *
 * Returns a Map<familyName, { delta, label }>.
 *   delta  – positive means team is worse (higher drift) than org
 *   label  – human-readable sentence, e.g.
 *            "Your team is 12 points above the org baseline"
 */
export function buildFamilyGaps(teamFamilies, orgFamilies) {
  if (!teamFamilies?.length || !orgFamilies?.length) return new Map();

  const orgByName = new Map(orgFamilies.map((f) => [f.familyName, f]));

  const gaps = new Map();

  teamFamilies.forEach((teamFamily) => {
    const orgFamily = orgByName.get(teamFamily.familyName);
    if (!orgFamily) return;

    const delta = teamFamily.score - orgFamily.score;
    const absDelta = Math.abs(delta);

    let label;
    if (absDelta < 4) {
      label = 'Roughly in line with the org baseline';
    } else if (delta > 0) {
      label = `Your team is ${absDelta} points above the org baseline — higher pressure here`;
    } else {
      label = `Your team is ${absDelta} points below the org baseline — less pressure here`;
    }

    gaps.set(teamFamily.familyName, { delta, label });
  });

  return gaps;
}

/**
 * Pick the family with the biggest positive (worse) gap and return a
 * one-liner suitable for a priority summary.
 */
export function topGapSummary(gaps) {
  if (!gaps?.size) return null;

  let worst = null;
  for (const [familyName, { delta }] of gaps) {
    if (!worst || delta > worst.delta) {
      worst = { familyName, delta };
    }
  }

  if (!worst || worst.delta < 4) return null;

  return `Your team is ${worst.delta} points worse than the org baseline in ${worst.familyName.toLowerCase()}.`;
}
