/**
 * Read-only Microsoft tenant consent diagnosis for one organization.
 *
 * Reports the stored consent state, then independently requests an app-only
 * token and lists which required application roles the tenant has actually
 * granted. Makes no changes — use the verify endpoint/flow to record success.
 *
 *   node scripts/microsoft-consent-check.js <name-or-domain>
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import {
  inspectMicrosoftCompanyWideAccess,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
} from '../services/microsoftAdminConsentService.js';

const target = process.argv.slice(2).find((v) => !v.startsWith('--'));
if (!target) throw new Error('Usage: microsoft-consent-check.js <name-or-domain>');
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
  const ms = org.integrations?.microsoft || {};

  const stored = {
    tenantId: ms.tenantId || null,
    delegatedTokenPresent: !!ms.accessToken,
    applicationConsentGrantedAt: ms.applicationConsentGrantedAt || null,
    applicationConsentVerifiedAt: ms.applicationConsentVerifiedAt || null,
    applicationConsentLastCheckedAt: ms.applicationConsentLastCheckedAt || null,
    applicationConsentLastError: ms.applicationConsentLastError || null,
    applicationConsentRoles: ms.applicationConsentRoles || [],
    applicationConsentSources: ms.applicationConsentSources || {},
  };

  let liveCheck = { attempted: false };
  if (ms.tenantId) {
    liveCheck.attempted = true;
    try {
      const assessment = await inspectMicrosoftCompanyWideAccess(org._id);
      liveCheck = {
        attempted: true,
        tokenAcquired: true,
        grantedRoles: assessment.roles,
        missingRequiredRoles: assessment.missingRoles,
        tenantOfToken: assessment.tenantId,
        sources: assessment.sources,
        verified: assessment.verified,
      };
    } catch (error) {
      liveCheck = { attempted: true, tokenAcquired: false, error: error.message };
    }
  }

  const consentLooksGranted = liveCheck.tokenAcquired === true && liveCheck.verified === true;

  console.log(
    JSON.stringify(
      {
        organization: { id: String(org._id), name: org.name, domain: org.domain },
        stored,
        liveCheck,
        requiredRoles: REQUIRED_MICROSOFT_APPLICATION_ROLES,
        verdict: consentLooksGranted
          ? 'Tenant application roles and all required Graph probes verified'
          : 'Tenant consent/access INCOMPLETE — see missingRequiredRoles, sources, or error',
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
