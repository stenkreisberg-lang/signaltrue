import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, RefreshCw, Send, Trash2, UserPlus } from 'lucide-react';
import api from '../utils/api';

interface Invitation {
  _id: string;
  email: string;
  name?: string;
  expiresAt: string;
  delivery?: {
    status?: string;
    error?: string;
  };
}

interface Props {
  role?: string;
}

const MANAGER_ROLES = new Set(['admin', 'hr_admin', 'master_admin']);

const actionLabel = (invitation: Invitation) =>
  new Date(invitation.expiresAt).getTime() <= Date.now() ? 'Send new link' : 'Resend';

export default function ITAdminInvitationManager({ role }: Props) {
  const canManageInvitations = Boolean(role && MANAGER_ROLES.has(role));
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadInvitations = useCallback(async () => {
    if (!canManageInvitations) return;
    setLoadingInvitations(true);
    try {
      const response = await api.get('/onboarding/invitations');
      setInvitations(response.data || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Invitations could not be loaded.');
    } finally {
      setLoadingInvitations(false);
    }
  }, [canManageInvitations]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  if (!canManageInvitations) return null;

  const sendInvitation = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/onboarding/invitations', {
        email: email.trim(),
        name: name.trim(),
        role: 'it_admin',
      });
      const result = response.data || {};
      setMessage(
        result.warning
          ? `The invitation link was created, but the email was not delivered automatically. Use “Copy link” below and send it directly. ${result.warning}`
          : result.renewed
            ? 'A new invitation link was sent.'
            : 'The invitation was sent.'
      );
      setEmail('');
      setName('');
      await loadInvitations();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'The invitation could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  const manageInvitation = async (invitation: Invitation, action: 'resend' | 'copy' | 'revoke') => {
    setActiveAction(`${invitation._id}:${action}`);
    setMessage('');
    setError('');
    try {
      if (action === 'resend') {
        const response = await api.post(`/onboarding/invitations/${invitation._id}/resend`);
        setMessage(
          response.data?.warning
            ? `A new link was created, but the email was not delivered automatically. Use “Copy link” and send it directly. ${response.data.warning}`
            : 'A new invitation link was sent.'
        );
      } else if (action === 'copy') {
        const response = await api.get(`/onboarding/invitations/${invitation._id}/link`);
        await navigator.clipboard.writeText(response.data.inviteUrl);
        setMessage('The invitation link was copied. You can send it to the IT administrator.');
      } else {
        await api.delete(`/onboarding/invitations/${invitation._id}`);
        setMessage('The invitation was revoked.');
      }
      await loadInvitations();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'The invitation could not be updated.');
    } finally {
      setActiveAction('');
    }
  };

  return (
    <section className="rounded-container border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-teal-50">
          <UserPlus className="h-4 w-4 text-teal-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-950">IT administrator access</h3>
          <p className="mt-1 text-caption text-slate-600">
            Invite or re-invite the person who will approve the organization-wide Microsoft or
            Google permissions. This creates their SignalTrue IT administrator account.
          </p>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-control border border-teal-200 bg-teal-50 px-3 py-2 text-caption text-teal-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-caption text-red-800">
          {error}
        </div>
      )}

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]" onSubmit={sendInvitation}>
        <label className="sr-only" htmlFor="it-admin-invite-name">
          IT administrator name
        </label>
        <input
          id="it-admin-invite-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name (optional)"
          className="rounded-control border border-slate-300 px-3 py-2 text-caption"
        />
        <label className="sr-only" htmlFor="it-admin-invite-email">
          IT administrator email
        </label>
        <input
          id="it-admin-invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="it-admin@company.com"
          required
          className="rounded-control border border-slate-300 px-3 py-2 text-caption"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-control bg-teal-700 px-4 py-2 text-caption font-medium text-white disabled:opacity-50"
        >
          {submitting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? 'Sending…' : 'Send invitation'}
        </button>
      </form>

      {(loadingInvitations || invitations.length > 0) && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-caption font-medium text-slate-700">Invitations awaiting acceptance</p>
          {loadingInvitations ? (
            <p className="mt-2 text-caption text-slate-500">Loading invitations…</p>
          ) : (
            <div className="mt-2 space-y-2">
              {invitations.map((invitation) => {
                const expired = new Date(invitation.expiresAt).getTime() <= Date.now();
                return (
                  <div
                    key={invitation._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-slate-50 px-3 py-3"
                  >
                    <div className="min-w-0 text-caption text-slate-700">
                      <p className="truncate font-medium">
                        {invitation.name ? `${invitation.name} · ` : ''}
                        {invitation.email}
                      </p>
                      <p className={expired ? 'text-amber-700' : 'text-slate-500'}>
                        {expired
                          ? 'Link expired — send a new link'
                          : `Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                        {invitation.delivery?.status ? ` · ${invitation.delivery.status}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={Boolean(activeAction)}
                        onClick={() => manageInvitation(invitation, 'resend')}
                        className="rounded-control bg-teal-50 px-3 py-1.5 text-caption font-medium text-teal-800 disabled:opacity-50"
                      >
                        {actionLabel(invitation)}
                      </button>
                      {!expired && (
                        <button
                          type="button"
                          disabled={Boolean(activeAction)}
                          onClick={() => manageInvitation(invitation, 'copy')}
                          className="flex items-center gap-1 rounded-control bg-white px-3 py-1.5 text-caption font-medium text-slate-700 disabled:opacity-50"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Revoke invitation for ${invitation.email}`}
                        disabled={Boolean(activeAction)}
                        onClick={() => manageInvitation(invitation, 'revoke')}
                        className="rounded-control bg-white p-2 text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
