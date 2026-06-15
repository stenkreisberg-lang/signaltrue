import mongoose from 'mongoose';

/**
 * OrgUnit — the reporting structure (who reports to whom).
 *
 * This is the missing primitive for the manager-overload pivot: without it,
 * span-of-control, per-manager metrics, and the flattening signal cannot be
 * measured. See docs/PIVOT_REPORT_SPEC.md §1.1.
 *
 * `userId` shares the id space with WorkEvent.actorUserId so metrics can be
 * joined server-side. `personHash` is the pseudonym used anywhere data leaves
 * the trust boundary (report/AI/export).
 *
 * Source: HRIS/Directory connector (SCIM, Google Directory, Entra ID), or an
 * inferred fallback (modal organizer/approver for a stable set of reports).
 */
const orgUnitSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    personHash: { type: String, index: true },

    // Reporting line
    managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    managerHash: { type: String, default: null },

    role: { type: String, default: 'IC' }, // e.g. IC, EM, PM, Director, VP
    roleLevel: { type: Number, default: 0 }, // 0 = IC ... n = exec
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    isManager: { type: Boolean, default: false, index: true },

    // Provenance + lifecycle (history enables span trend)
    source: { type: String, enum: ['hris', 'directory', 'inferred', 'manual'], default: 'manual' },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null }, // null = current
  },
  { timestamps: true }
);

orgUnitSchema.index({ orgId: 1, managerUserId: 1, effectiveTo: 1 });
orgUnitSchema.index({ orgId: 1, userId: 1, effectiveTo: 1 });

export default mongoose.models.OrgUnit || mongoose.model('OrgUnit', orgUnitSchema);
