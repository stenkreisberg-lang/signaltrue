/**
 * Merge duplicate team variants so more people sit in reportable teams.
 *
 *   node scripts/consolidate-teams.js <name-or-domain>           # preview
 *   node scripts/consolidate-teams.js <name-or-domain> --apply   # merge
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import {
  applyTeamConsolidation,
  planTeamConsolidation,
} from '../services/teamConsolidationService.js';

const args = process.argv.slice(2);
const target = args.find((v) => !v.startsWith('--'));
const apply = args.includes('--apply');

// Equivalents that cannot be inferred from the names, e.g. a translation:
//   --merge "Turundus=>Marketing"
const aliases = args
  .filter((v) => v.startsWith('--merge='))
  .map((v) => v.slice('--merge='.length).split('=>').map((s) => s.trim()))
  .filter((pair) => pair.length === 2 && pair[0] && pair[1]);

if (!target) {
  throw new Error(
    'Usage: consolidate-teams.js <name-or-domain> [--apply] [--merge="From=>To"]'
  );
}
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

await mongoose.connect(process.env.MONGO_URI);
try {
  const matches = await Organization.find({
    $or: [
      { name: { $regex: target, $options: 'i' } },
      { domain: { $regex: target, $options: 'i' } },
    ],
  });
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one matching organization; found ${matches.length}`);
  }
  const org = matches[0];
  const minTeamSize = Math.max(5, org.settings?.minTeamSize ?? 5);

  const result = apply
    ? await applyTeamConsolidation(org._id, { minTeamSize, aliases })
    : await planTeamConsolidation(org._id, { minTeamSize, aliases });

  console.log(`\n${org.name} — team consolidation ${apply ? '(APPLIED)' : '(preview)'}\n`);

  if (result.merges.length === 0) {
    console.log('  No duplicate team names found.');
  }
  for (const merge of result.merges) {
    console.log(`  Keep "${merge.keep.name}" (${merge.keep.members} members)`);
    for (const a of merge.absorb) console.log(`    ← merge "${a.name}" (${a.members})`);
    console.log(`    = ${merge.membersAfter} members after\n`);
  }

  if (result.emptyTeams.length) {
    console.log(`  Empty teams to remove: ${result.emptyTeams.map((t) => t.name).join(', ')}\n`);
  }

  console.log(
    `  Reportable teams (>=${result.minTeamSize}): ${result.reportableTeams.before} → ${result.reportableTeams.after}`
  );
  console.log(
    `  People in reportable teams:  ${result.peopleInReportableTeams.before} → ${result.peopleInReportableTeams.after}`
  );

  if (result.stillBelowFloor.length) {
    console.log(
      `\n  Still below the floor (needs a human decision, not merged):\n${result.stillBelowFloor
        .map((t) => `    ${t.name} (${t.members})`)
        .join('\n')}`
    );
  }
  if (apply) {
    console.log(
      `\n  Moved ${result.movedUsers} users and ${result.movedEvents} events; removed ${result.removedEmptyTeams} empty teams.`
    );
  }
} finally {
  await mongoose.disconnect();
}
