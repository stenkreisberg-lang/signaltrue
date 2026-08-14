import { google } from 'googleapis';

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
];

export function getGoogleServiceAccountConfig() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) return null;
  try {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT contains invalid JSON');
  }
}

export function createGoogleWorkspaceAuth(subject, scopes = GOOGLE_WORKSPACE_SCOPES) {
  const credentials = getGoogleServiceAccountConfig();
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error('SignalTrue Google Workspace service account is not configured');
  }
  if (!subject) throw new Error('A delegated Google Workspace administrator email is required');
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
    subject,
  });
}

export async function verifyGoogleWorkspaceDelegation(subject) {
  const auth = createGoogleWorkspaceAuth(subject, [GOOGLE_WORKSPACE_SCOPES[0]]);
  await auth.authorize();
  const admin = google.admin({ version: 'directory_v1', auth });
  const response = await admin.users.list({ customer: 'my_customer', maxResults: 1 });
  return { directoryVerified: true, sampleUsersFound: response.data.users?.length || 0 };
}

export function getGoogleWorkspacePublicConfig() {
  const credentials = getGoogleServiceAccountConfig();
  return {
    serviceAccountConfigured: !!credentials,
    serviceAccountClientId: credentials?.client_id || null,
    requiredScopes: GOOGLE_WORKSPACE_SCOPES,
  };
}
