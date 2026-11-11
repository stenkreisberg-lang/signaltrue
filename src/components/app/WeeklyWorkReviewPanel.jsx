import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const METRICS = [
  ['meetingHoursPerRepresentedPerson', 'Koosolekuaeg inimese kohta', 'h'],
  ['meetingsPerRepresentedPerson', 'Koosolekud inimese kohta', ''],
  ['messagesPerRepresentedPerson', 'Sõnumid saatja kohta', ''],
  ['afterHoursPct', 'Pärast tööaega saadetud sõnumid', '%'],
  ['focusHoursPerRepresentedPerson', 'Vaba kalendriaeg inimese kohta', 'h'],
  ['recurringLoadPct', 'Korduvkoosolekute osakaal', '%'],
  ['calendarFragmentation', 'Kalendri killustatus', '/100'],
];
const INITIAL = {
  teamId: '',
  metricKey: 'meetingHoursPerRepresentedPerson',
  title: '',
  hypothesis: '',
  ownerName: '',
  successCondition: '',
  reviewDays: '14',
};

function prettyDate(value) {
  return value ? new Date(value).toLocaleDateString('et-EE', { timeZone: 'Europe/Tallinn' }) : '—';
}
function valueOf(value, unit = '') {
  if (value == null || !Number.isFinite(Number(value))) return 'Andmed puuduvad';
  return (
    Number(value).toLocaleString('et-EE', { maximumFractionDigits: 1 }) +
    (unit === 'h' ? ' h' : unit === '%' ? '%' : '')
  );
}

export default function WeeklyWorkReviewPanel() {
  const [teams, setTeams] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(INITIAL);
  const [selectedReview, setSelectedReview] = useState('');
  const [decision, setDecision] = useState('investigate');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [trends, actions] = await Promise.all([
      api.get('/weekly-brief/trends'),
      api.get('/weekly-brief/action-reviews'),
    ]);
    setTeams(trends.data.teams || []);
    setReviews(actions.data.reviews || []);
  }, []);

  useEffect(() => {
    load().catch(() => setError('Mõõdetud tiimide või tegevuste laadimine ebaõnnestus.'));
  }, [load]);

  const teamId = form.teamId || teams[0]?.id || '';
  const team = useMemo(() => teams.find((item) => item.id === teamId), [teams, teamId]);
  const measurement = team?.metricSummaries?.[form.metricKey];
  const unit = METRICS.find(([key]) => key === form.metricKey)?.[2] || '';
  const canCreate =
    measurement?.current != null &&
    form.title.trim() &&
    form.ownerName.trim() &&
    form.hypothesis.trim() &&
    form.successCondition.trim();

  const createAction = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/weekly-brief/action-reviews', {
        ...form,
        teamId,
        reviewDays: Number(form.reviewDays),
      });
      setForm({ ...INITIAL, teamId });
      setMessage('Tegevus salvestatud. Järelkontrolli kuupäev ja algmõõtmine on fikseeritud.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Tegevust ei õnnestunud salvestada.');
    } finally {
      setBusy(false);
    }
  };

  const review = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/weekly-brief/action-reviews/' + selectedReview + '/review', {
        decision,
        note,
      });
      setMessage('Järelkontroll salvestatud. Võrdlus põhineb sama tiimi uuel mõõtmisperioodil.');
      setSelectedReview('');
      setNote('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Järelkontrolli salvestamine ebaõnnestus.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="action-reviews" className="app-panel mb-6" aria-label="Tegevused ja järelkontroll">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Otsus ja järelkontroll
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Mida muutsite ja kas mõõdetud olukord muutus?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pane kirja üks konkreetne muudatus. SignaalTrue salvestab sama tiimi algmõõtmise,
          vastutaja ja kontrollkuupäeva. Ülevaatus ei tähenda automaatselt, et muudatus põhjustas
          tulemuse.
        </p>
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-3 rounded-md bg-teal-50 p-3 text-sm text-teal-900">
          {message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={createAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">1. Pane kokkulepe kirja</h3>
          <label className="block text-sm font-semibold">
            Tiim
            <select
              value={teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
            >
              {!teams.length && <option value="">Mõõdetud tiimid puuduvad</option>}
              {teams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Mõõdik
            <select
              value={form.metricKey}
              onChange={(e) => setForm({ ...form, metricKey: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
            >
              {METRICS.map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <strong>Alusmõõtmine:</strong> {valueOf(measurement?.current, unit)}
            <p className="mt-1 text-xs text-slate-600">
              {measurement?.current == null
                ? 'Selle tiimi ja mõõdiku viimase perioodi kontrollitud väärtus puudub.'
                : 'Võrdlus algab viimase täieliku mõõdetud nädalaga.'}
            </p>
          </div>
          <label className="block text-sm font-semibold">
            Mida muudate?
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
              placeholder="Näiteks lühendame iganädalast koosolekut"
            />
          </label>
          <label className="block text-sm font-semibold">
            Miks?
            <textarea
              required
              maxLength={600}
              value={form.hypothesis}
              onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
              rows={2}
              placeholder="Mis võiks muutuda ja miks?"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold">
              Vastutaja
              <input
                required
                maxLength={120}
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              />
            </label>
            <label className="block text-sm font-semibold">
              Kontroll
              <select
                value={form.reviewDays}
                onChange={(e) => setForm({ ...form, reviewDays: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
              >
                <option value="14">14 päeva pärast</option>
                <option value="28">28 päeva pärast</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Mida peab järgmine mõõtmine näitama?
            <input
              required
              maxLength={360}
              value={form.successCondition}
              onChange={(e) => setForm({ ...form, successCondition: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
            />
          </label>
          <button
            type="submit"
            disabled={!canCreate || busy}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Salvesta tegevus
          </button>
        </form>

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900">2. Vaata varasemaid kokkuleppeid</h3>
          {!reviews.length && (
            <p className="text-sm text-slate-600">
              Veel pole selle aruande kaudu kokkuleppeid salvestatud.
            </p>
          )}
          {reviews.map((item) => {
            const due = item.status !== 'completed' && new Date(item.reviewDate) <= new Date();
            const latest = item.reviews?.at(-1);
            return (
              <div key={item._id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span
                    className={
                      'rounded px-2 py-1 text-xs ' +
                      (due ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')
                    }
                  >
                    {item.status === 'completed'
                      ? 'Lõpetatud'
                      : due
                        ? 'Kontrolli aeg käes'
                        : 'Ülevaatus ' + prettyDate(item.reviewDate)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {item.teamName} · {item.ownerName}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Algväärtus:{' '}
                  {valueOf(
                    item.baselineValue,
                    METRICS.find(([key]) => key === item.metricKey)?.[2]
                  )}
                  {' · '}Alus: {item.reportVersion}
                </p>
                {latest && (
                  <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-700">
                    Viimane ülevaatus:{' '}
                    {latest.comparability === 'measured'
                      ? 'enne ' +
                        valueOf(latest.baselineValue) +
                        ', pärast ' +
                        valueOf(latest.currentValue)
                      : latest.reason}
                    {' · '}Otsus: {latest.decision}
                  </p>
                )}
                {due && (
                  <button
                    type="button"
                    onClick={() => setSelectedReview(item._id)}
                    className="mt-2 text-sm font-semibold text-teal-800 underline"
                  >
                    Tee järelkontroll
                  </button>
                )}
              </div>
            );
          })}
          {selectedReview && (
            <form className="rounded-lg bg-teal-50 p-3" onSubmit={review}>
              <h4 className="font-semibold text-slate-900">Järelkontrolli otsus</h4>
              <label className="mt-2 block text-sm">
                Järgmine samm
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="investigate">Vajab lisakontrolli</option>
                  <option value="continue">Jätkame</option>
                  <option value="adjust">Muudame tegevust</option>
                  <option value="close">Lõpetame</option>
                </select>
              </label>
              <label className="mt-2 block text-sm">
                Mida arutelus selgus?
                <textarea
                  className="mt-1 w-full rounded border p-2"
                  rows={2}
                  maxLength={600}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy}
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Salvesta ülevaatus
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReview('')}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Loobu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
