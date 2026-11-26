const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function managerInvitationEmail(teamName, url, locale) {
  const et = locale === 'et';
  const subject = et ? 'SignalTrue: kutse tiimi töömustrite vaatamiseks' : 'SignalTrue team insight access invitation';
  const heading = et ? 'Kutse tiimijuhile' : 'Invitation to view team work patterns';
  const scope = et ? 'Personalijuht kutsus sind vaatama selle tiimi koondandmeid' : 'An authorised administrator invited you to view aggregate work patterns for this team';
  const action = et ? 'Vaata kutset' : 'Review invitation';
  const details = et
    ? 'Kutse kehtib seitse päeva. Logi sisse töömeiliga, millele kutse saadeti. Esmakordsel kasutamisel loo kõigepealt parool. Tiimi andmed avanevad pärast kutse kinnitamist.'
    : 'The invitation expires in seven days. Sign in with the invited company email. If this is your first visit, create a password before signing in. Team data becomes available after you accept.';
  const help = et ? 'Kui kutse tuli ootamatult, võta ühendust personalijuhiga.' : 'If this invitation was unexpected, contact HR.';
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px;color:#0f172a">' +
    '<p>SignalTrue</p><h2>' + heading + '</h2><p>' + scope + ': <strong>' + escapeHtml(teamName) + '</strong>.</p>' +
    '<p>' + details + '</p><p><a href="' + escapeHtml(url) + '">' + action + '</a></p><p>' + help + '</p></div>';
  return { subject, html };
}
