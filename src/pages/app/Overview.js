import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Spinner } from '../../components/UIComponents';
import HRDecisionSnapshot from '../../components/app/HRDecisionSnapshot';
import AppShell from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

function MeetingHistory({ brief }) {
  const points = (brief?.trend || []).map((point) => ({
    label: point.weekStart
      ? new Date(point.weekStart).toLocaleDateString('et-EE', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Tallinn' })
      : point.label,
    value: point.meetingHours == null ? null : Number(point.meetingHours),
  }));
  const measured = points.filter((point) => point.value != null && Number.isFinite(point.value));
  return (
    <section className="app-panel mb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Mõõdetud ajalugu</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Koosolekutele kulunud aeg</h2>
          <p className="mt-1 text-sm text-slate-600">
            Osalejatunnid kalendrikasutaja kohta nädalas. Puuduv mõõtmine jääb graafikul tühjaks.
          </p>
        </div>
        <Link to="/app/latest-brief" className="text-sm font-semibold text-teal-800 underline">
          Kõik mõõdikud ja tiimide võrdlus
        </Link>
      </div>
      {measured.length < 2 ? (
        <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          Võrreldava ajatrendi näitamiseks ei ole piisavalt mõõdetud nädalaid.
        </p>
      ) : (
        <div className="h-56" role="img" aria-label="Koosolekuaja ajalooline muutus, puuduvad mõõtmised on tühjad">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 14, right: 22, bottom: 6, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" h" />
              <Tooltip formatter={(value) => [value == null ? 'Andmed puuduvad' : value + ' h', 'Koosolekuaeg']} />
              <Line type="linear" dataKey="value" stroke="#0f766e" strokeWidth={3}
                connectNulls={false} dot={{ r: 3 }} name="Koosolekuaeg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function Overview() {
  const [calibrationStatus, setCalibrationStatus] = useState(null);
  const [brief, setBrief] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const context = await getAuthenticatedContext();
        if (!active) return;
        setUser(context.user);
        if (!context.orgId) throw new Error('Kontoga pole organisatsiooni seotud.');
        if (['master_admin', 'admin', 'hr_admin', 'executive'].includes(context.user?.role)) {
          const response = await api.get('/weekly-brief/latest');
          if (active) setBrief(response.data);
        }
        try {
          const status = await api.get('/calibration/status/' + context.orgId);
          if (active) setCalibrationStatus(status.data);
        } catch {
          if (active) setCalibrationStatus(null);
        }
      } catch (reason) {
        if (active) setError(reason.response?.data?.message || reason.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <AppShell user={user} section="Ülevaade">
        <div className="app-panel flex min-h-64 items-center justify-center">
          <Spinner size="large" />
          <span className="ml-3 text-sm text-slate-600">Laadin töökorralduse ülevaadet…</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Ülevaade">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">SignalTrue / Töökorralduse mõõtmine</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Ülevaade</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Mis muutus eelmisel nädalal ning mida tasub järgmisena kontrollida?
        </p>
      </header>
      {error && <div role="alert" className="app-panel mb-5 border-red-200 bg-red-50 text-sm text-red-800">{error}</div>}
      {brief ? (
        <>
          {brief.freshness?.refreshFailed && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Andmete uuendamine ebaõnnestus. Kuvatakse varasem salvestatud aruanne.
            </p>
          )}
          <HRDecisionSnapshot brief={brief} />
          <MeetingHistory brief={brief} />
          <section className="app-panel mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Andmete katvus ja kontroll</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Seotud sündmusi: {brief.coverage?.mappingCoveragePct ?? '—'}%.
                  Allikad ja tiimide koosseis tuleb enne järeldusi üle kontrollida.
                </p>
              </div>
              <Link to="/app/signal-coverage" className="text-sm font-semibold text-teal-800 underline">
                Vaata andmeallikaid
              </Link>
            </div>
          </section>
        </>
      ) : !error ? (
        <section className="app-panel mb-6">
          <h2 className="font-bold text-slate-900">Aruanne puudub</h2>
          <p className="mt-2 text-sm text-slate-600">
            Kui allikad pole valmis või kontol puudub HR aruande ligipääs, ei kuvata väljamõeldud mõõtmisi.
          </p>
        </section>
      ) : null}
      {calibrationStatus?.readinessStatus === 'setup_incomplete' && (
        <section className="app-panel mb-4 border-amber-200">
          <h2 className="font-semibold text-slate-900">Andmete seadistamine vajab tähelepanu</h2>
          <p className="mt-1 text-sm text-slate-700">
            Kontrolli integratsioonide õigusi, töötajate seoseid ja saabuvate sündmuste katvust.
          </p>
          <Link to="/app/signal-coverage" className="mt-2 inline-block text-sm font-semibold underline">
            Kontrolli allikaid
          </Link>
        </section>
      )}
    </AppShell>
  );
}
