import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowDown, TrendingUp, AlertTriangle } from 'lucide-react';
import LeadForm from '../components/LeadForm';
import PageMeta from '../components/PageMeta';
import { trackFunnelEvent } from '../lib/analytics';

const EhrsSummit2026: React.FC = () => {
  const scrollToForm = () => {
    trackFunnelEvent('primary_cta_click', {
      cta_location: 'ehrs_2026_hero',
      cta_destination: '#form-section',
      intent: 'demo',
    });
    const formSection = document.getElementById('form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageMeta
        title="SignalTrue at EHRS Summit 2026"
        description="Request a short SignalTrue strategic review after EHRS Summit 2026."
        path="/ehrs-summit-2026"
        lang="et"
      />
      {/* ===================== HERO SECTION ===================== */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
          {/* Conference Context Badge */}
          <div className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-caption font-semibold tracking-wide">
              EHRS Summit 2026 osalejatele
            </span>
          </div>

          {/* Hero Grid: Content + Signal Card */}
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            {/* Left: Main Content (3 cols) */}
            <div className="lg:col-span-3">
              {/* Main Headline */}
              <h1 className="text-section sm:text-display lg:text-display font-bold text-slate-900 leading-[1.15] mb-8">
                SignalTrue ei küsi, kas inimesed on väsinud.
                <br />
                <span className="text-blue-600">
                  Ta näitab, millal töökorraldus hakkab neid üle koormama.
                </span>
              </h1>

              {/* Subheadline - Timing statements */}
              <div className="text-body sm:text-lead text-slate-600 mb-8 leading-relaxed">
                <p className="mb-1">Enne kui rahuloluküsitlused muutuvad punaseks.</p>
                <p className="mb-1">Enne kui fookus kaob.</p>
                <p>Enne kui tekivad vaiksed lahkumised.</p>
              </div>

              {/* Supporting paragraph */}
              <div className="text-body sm:text-body text-slate-700 mb-8 leading-relaxed">
                <p className="mb-5">
                  SignalTrue analüüsib töömetaandmeid (kalendrid, koostöökoormus, fookuse
                  killustumine) ja annab juhile iganädalase varajase signaali süsteemsest
                  ülekoormusest.
                </p>
                <p className="text-slate-500">
                  Ilma sisu lugemata.
                  <br />
                  Ilma indiviide jälgimata.
                  <br />
                  Ilma uusi küsimustikke lisamata.
                </p>
              </div>

              {/* CTA Button */}
              <Button
                onClick={scrollToForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 h-auto text-body rounded-control font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30"
              >
                Broneeri 15-min strateegiline ülevaade
                <ArrowDown className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Right: Signal Card Mockup (2 cols) */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900 rounded-container p-6 shadow-2xl shadow-slate-900/20">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-slate-400 text-caption font-medium">
                    Nädalane riskisignaal
                  </span>
                  <span className="text-caption text-slate-500">Nädal 7 / 2026</span>
                </div>

                {/* Signal Metrics */}
                <div className="space-y-4">
                  {/* Overload Metric */}
                  <div className="bg-slate-800/50 rounded-container p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-caption">Overload indeks</span>
                      <div className="flex items-center text-amber-400">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="font-bold">↑ 17%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-amber-400 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                  </div>

                  {/* Focus Fragmentation */}
                  <div className="bg-slate-800/50 rounded-container p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-caption">Fookuse killustumine</span>
                      <div className="flex items-center text-orange-400">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="font-bold">↑ 12%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-orange-400 h-2 rounded-full"
                        style={{ width: '58%' }}
                      ></div>
                    </div>
                  </div>

                  {/* Meeting Load */}
                  <div className="bg-slate-800/50 rounded-container p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-caption">Koosolekukoormus</span>
                      <div className="flex items-center text-red-400">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="font-bold">Kõrge</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-red-400 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-caption">3 meeskonda vajavad tähelepanu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROBLEM SECTION ===================== */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
          {/* Section Headline */}
          <h2 className="text-lead sm:text-section lg:text-display font-bold text-slate-900 leading-tight mb-6">
            Kas sa juhid tööheaolu andmete või tunnetuse pealt?
          </h2>

          {/* Problem Question */}
          <p className="text-body sm:text-lead text-slate-700 mb-10 leading-relaxed">
            Kas sul on täna objektiivne viis näha, millal meeskonna koormus hakkab vaikselt
            kontrolli alt väljuma?
          </p>

          {/* Pain Points */}
          <ul className="space-y-4 text-body text-slate-700 mb-10">
            <li className="flex items-start">
              <span className="text-slate-400 mr-4 mt-1.5">—</span>
              <span>Kalendrid on täis, aga töö ei liigu kiiremini</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-400 mr-4 mt-1.5">—</span>
              <span>Koosolekuid on rohkem, otsuseid vähem</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-400 mr-4 mt-1.5">—</span>
              <span>Pingutus kasvab, tulemus mitte</span>
            </li>
            <li className="flex items-start">
              <span className="text-slate-400 mr-4 mt-1.5">—</span>
              <span>Rahuloluküsitlused ütlevad "pigem hästi", aga tunnetus ütleb muud</span>
            </li>
          </ul>

          {/* Key Insight */}
          <div className="bg-white rounded-container p-6 border-l-4 border-blue-600 shadow-sm mb-10">
            <p className="text-body text-slate-800 font-medium">Meeleolu on hiline näitaja.</p>
            <p className="text-body text-blue-600 font-semibold">
              Käitumuslikud mustrid muutuvad varem.
            </p>
          </div>

          {/* Concrete Scenario */}
          <div className="bg-slate-100 rounded-container p-6">
            <p className="text-slate-700 text-body sm:text-body leading-relaxed italic">
              "Kui uue kvartali alguses projektide maht kasvab 30%, kas sa näed, millistes tiimides
              hakkab fookus killustuma enne, kui inimesed seda ise teadvustavad?"
            </p>
          </div>
        </div>
      </section>

      {/* ===================== DIFFERENCE SECTION ===================== */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
          <h2 className="text-lead sm:text-section lg:text-display font-bold text-slate-900 leading-tight mb-8">
            Mitte veel üks küsitlus.
            <br />
            <span className="text-blue-600">Vaid käitumuslik varajane hoiatussüsteem.</span>
          </h2>

          <div className="text-body text-slate-700 leading-relaxed mb-8">
            <p className="mb-6">
              SignalTrue tuvastab organisatsioonis käitumusliku triivi – hetke, kus töödisain,
              koostööintensiivsus ja fookuse killustumine hakkavad süsteemselt koormust kasvatama.
            </p>
          </div>

          {/* Key Differentiator */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 bg-slate-100 rounded-container p-6 text-center">
              <p className="text-slate-500 text-caption uppercase tracking-wider mb-2">
                Tavaline lähenemine
              </p>
              <p className="text-slate-800 font-semibold text-body">Mõõdab arvamusi</p>
            </div>
            <div className="flex-1 bg-blue-600 rounded-container p-6 text-center">
              <p className="text-blue-200 text-caption uppercase tracking-wider mb-2">SignalTrue</p>
              <p className="text-white font-semibold text-body">Mõõdab mustrit</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== VALUE SECTION ===================== */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-20 lg:py-28">
          <h2 className="text-lead sm:text-section lg:text-display font-bold text-slate-900 mb-10">
            Mida see juhile annab?
          </h2>

          {/* Value Points */}
          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-container p-6 border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-control flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <p className="text-slate-800 font-medium">
                Iganädalane varajane signaal võimaliku ülekoormuse kohta
              </p>
            </div>

            <div className="bg-white rounded-container p-6 border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-control flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <p className="text-slate-800 font-medium">
                Meeskondade võrdlev pilt ilma isikupõhise jälgimiseta
              </p>
            </div>

            <div className="bg-white rounded-container p-6 border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-control flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <p className="text-slate-800 font-medium">
                Andmepõhine alus otsustele (koosolekukoormus, prioriteedid, fookus)
              </p>
            </div>

            <div className="bg-white rounded-container p-6 border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-control flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <p className="text-slate-800 font-medium">
                Võimalus reageerida 4–8 nädalat enne nähtavaid probleeme
              </p>
            </div>
          </div>

          {/* Closing Statement */}
          <div className="bg-slate-900 rounded-container p-8 text-center">
            <p className="text-slate-300 text-body mb-1">Läbipõlemine ei alga aususest.</p>
            <p className="text-white text-lead font-semibold">Ta algab vastupidamisest.</p>
          </div>
        </div>
      </section>

      {/* ===================== FORM SECTION ===================== */}
      <section id="form-section" className="bg-white">
        <div className="max-w-2xl mx-auto px-6 py-20 lg:py-28">
          {/* Form Header */}
          <div className="text-center mb-10">
            <h2 className="text-lead sm:text-section font-bold text-slate-900 mb-4">
              Soovid näha, kas SignalTrue annaks sinu organisatsioonile reaalse eelise?
            </h2>
            <p className="text-body text-slate-600">
              Jäta oma kontakt ja saad lühikese, konkreetse 15-min ülevaate, kus vaatame, kas ja
              kuidas see töötaks sinu organisatsiooni kontekstis.
            </p>
          </div>

          <LeadForm
            ctaLocation="ehrs_2026_form"
            source="EHRS2026"
            tag="EHRS2026"
            heading="Request the review"
            intro="Use the same short, confirmed request path as the SignalTrue website."
            intent="demo"
            formVersion="ehrs_2026_p0_v1"
          />

          {/* Privacy Policy Link */}
          <p className="text-center text-caption text-slate-500 mt-6">
            Esitades vormi, nõustud meie{' '}
            <Link to="/trust" className="text-blue-600 hover:underline">
              privaatsuspoliitikaga
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ===================== MINIMAL FOOTER ===================== */}
      <footer className="bg-slate-50 px-6 py-8 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <Link to="/trust" className="text-caption text-slate-500 hover:text-slate-700">
            Privaatsuspoliitika
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default EhrsSummit2026;
