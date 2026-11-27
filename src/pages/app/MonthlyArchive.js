import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

function date(value, locale) {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    return locale === 'et' ? 'Andmed puuduvad' : 'Not recorded';
  return new Date(value).toLocaleDateString(locale === 'et' ? 'et-EE' : 'en-GB', {
    dateStyle: 'medium',
  });
}

export default function MonthlyArchive() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const context = await getAuthenticatedContext();
        if (!context.orgId) throw new Error('No organisation selected');
        if (active) setUser(context.user);
        const { data } = await api.get('/reports/monthly/org/' + context.orgId + '/archive');
        if (!Array.isArray(data.reports)) throw new Error('Archive unavailable');
        if (active) setReports(data.reports);
      } catch {
        if (active) setError(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const locale = user?.reportLanguage || 'en';
  const t = (en, et) => (locale === 'et' ? et : en);
  return (
    <AppShell locale={locale} user={user} section={t('Reports', 'Aruanded')}>
      <PageHeader
        title={t('Monthly report archive', 'Kuuaruannete arhiiv')}
        description={t(
          'Saved reporting periods and recorded email delivery. Historical scores are not republished.',
          'Siin näed salvestatud aruandeperioode ja e-kirja saatmise aega.'
        )}
        action={<Link to="/app/latest-brief">{t('Open weekly brief', 'Ava nädalaaruanne')}</Link>}
      />
      <section className="app-panel">
        {error ? (
          <p role="alert">
            {t(
              'The archive is unavailable. Please try again later.',
              'Arhiivi ei saanud laadida. Proovi hiljem uuesti.'
            )}
          </p>
        ) : reports === null ? (
          <p role="status">{t('Loading saved reports…', 'Aruannete laadimine…')}</p>
        ) : reports.length === 0 ? (
          <p>
            {t('No monthly reports have been recorded.', 'Kuuaruandeid pole veel salvestatud.')}
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {reports.map((report) => (
              <article key={report._id} className="py-4">
                <h2 className="font-semibold">
                  {date(report.periodStart, locale)} – {date(report.periodEnd, locale)}
                </h2>
                <p className="text-sm text-slate-600">
                  {report.reportMode === 'decision'
                    ? t('Decision brief', 'Juhtkonna kuuaruanne')
                    : report.reportMode === 'setup'
                      ? t('Setup brief', 'Andmete valmisoleku aruanne')
                      : t('Report type not recorded', 'Aruande liik pole salvestatud')}
                  {' · '}
                  {report.accessStatus === 'archived'
                    ? t('Archived', 'Arhiveeritud')
                    : t('Saved', 'Salvestatud')}
                </p>
                <p className="text-sm text-slate-600">
                  {t('Generated', 'Koostatud')} {date(report.generatedAt, locale)} ·{' '}
                  {t('Email sent', 'E-kiri saadetud')} {date(report.emailSentAt, locale)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
