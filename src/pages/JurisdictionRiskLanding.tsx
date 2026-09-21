import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

type MarketConfig = {
  market: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  legalTitle: string;
  legalBody: string;
  regulatorLabel: string;
  regulatorUrl: string;
  evidenceTitle: string;
  evidencePoints: string[];
  assessmentTitle: string;
  assessmentBody: string;
  disclaimer: string;
};

const MARKETS: Record<string, MarketConfig> = {
  '/norway/psychosocial-work-environment': {
    market: 'norway',
    title: 'Psykososialt arbeidsmiljø og kontrollbevis | SignalTrue',
    description:
      'Se hvordan teamnivådata kan støtte systematisk arbeid med psykososialt arbeidsmiljø mellom kartlegginger, uten individuell overvåking.',
    eyebrow: 'Norge · psykososialt arbeidsmiljø',
    headline: 'Regelverket ble tydeligere i 2026. Risikobildet må fortsatt holdes levende.',
    intro:
      'Arbeidstilsynet presiserer fra 1. januar 2026 hvordan arbeidsgivere skal jobbe systematisk og forebyggende med det psykososiale arbeidsmiljøet. SignalTrue er laget for ett praktisk gap: å se når arbeidsmønstre endrer seg mellom formelle kartlegginger og å kontrollere om et tiltak faktisk endret arbeidet.',
    legalTitle: 'Det regulatoriske utgangspunktet',
    legalBody:
      'Arbeidstilsynet sier at arbeidsgiver skal kartlegge og risikovurdere psykososiale arbeidsmiljøfaktorer og iverksette nødvendige tiltak. Tiltak bør så langt som mulig rette seg mot årsakene til risikoen, blant annet organisatoriske eller arbeidsmessige forhold.',
    regulatorLabel: 'Arbeidstilsynet: Psykososialt arbeidsmiljø',
    regulatorUrl: 'https://www.arbeidstilsynet.no/arbeidsmiljo/psykososialt-arbeidsmiljo/',
    evidenceTitle: 'Hva SignalTrue kan legge til mellom kartleggingene',
    evidencePoints: [
      'Se vedvarende endringer i møtebelastning, arbeid utenfor normal tid og koordinering på gruppenivå.',
      'Knytt observasjonen til organisatorisk kontekst og arbeidstakernes egne beskrivelser.',
      'Definer forventet effekt av et tiltak før det gjennomføres.',
      'Sammenlign før og etter, og se om forbedringen varer eller belastningen flytter seg.',
    ],
    assessmentTitle: 'Hvor moden er deres dokumentasjonskjede?',
    assessmentBody:
      'Ta en kort vurdering av hvordan dere oppdager endring, undersøker årsak, kontrollerer tiltak og beskytter personvernet.',
    disclaimer:
      'SignalTrue erstatter ikke arbeidsgivers risikovurdering, medvirkning eller juridiske ansvar. Løsningen gir supplerende arbeidsmønsterevidens på gruppenivå.',
  },
  '/uk/work-related-stress': {
    market: 'uk',
    title: 'Work-related stress risk and control evidence | SignalTrue',
    description:
      'Add team-level work-pattern evidence between stress risk assessments and verify whether organisational controls changed the work.',
    eyebrow: 'United Kingdom · work-related stress',
    headline:
      'A stress risk assessment is a process. The work keeps changing after the form is complete.',
    intro:
      'HSE says employers have a legal duty to protect workers from stress at work by carrying out a risk assessment and acting on it. Its Management Standards focus on demands, control, support, relationships, role and change. SignalTrue adds a narrower evidence layer: whether observable work conditions changed and whether a control produced the intended effect.',
    legalTitle: 'The regulatory starting point',
    legalBody:
      'HSE describes work-related stress management as an organisational, preventative process. Employers must assess the risk of stress-related ill health arising from work activities and take action to control it.',
    regulatorLabel: 'HSE: Tackling work-related stress using the Management Standards',
    regulatorUrl: 'https://www.hse.gov.uk/stress/standards/',
    evidenceTitle: 'What SignalTrue can add between formal reviews',
    evidencePoints: [
      'Track sustained team-level change in meeting demand, after-hours activity and coordination pressure.',
      'Use the observation to focus worker consultation rather than replacing it.',
      'Record what an organisational control is expected to change before implementation.',
      'Compare before and after evidence, then check sustainability and possible workload migration.',
    ],
    assessmentTitle: 'Can you prove the control changed the work?',
    assessmentBody:
      'Take the Control Evidence Maturity Assessment to identify the weakest point in your detection, investigation, verification and governance process.',
    disclaimer:
      'SignalTrue is not a legal compliance tool and does not diagnose stress. Human judgement, worker consultation and statutory duties remain with the employer.',
  },
  '/germany/psychische-belastung': {
    market: 'germany',
    title: 'Psychische Belastung und Wirksamkeitskontrolle | SignalTrue',
    description:
      'Teambezogene Arbeitsmuster als ergänzende Evidenz für Gefährdungsbeurteilung, Maßnahmen und Wirksamkeitskontrolle.',
    eyebrow: 'Deutschland · psychische Belastung',
    headline:
      'Gefährdungsbeurteilung endet nicht bei der Maßnahme. Entscheidend ist die Wirksamkeit.',
    intro:
      '§ 5 Arbeitsschutzgesetz nennt psychische Belastungen bei der Arbeit ausdrücklich als mögliche Gefährdung. BAuA beschreibt die Gefährdungsbeurteilung als Prozess: Gefährdungen ermitteln, Maßnahmen umsetzen, Wirksamkeit prüfen und die Beurteilung fortschreiben. SignalTrue unterstützt genau den Übergang zwischen Maßnahme und Wirksamkeitsprüfung mit aggregierter Arbeitsmuster-Evidenz.',
    legalTitle: 'Der regulatorische Ausgangspunkt',
    legalBody:
      'Das Arbeitsschutzgesetz verlangt die Beurteilung arbeitsbedingter Gefährdungen. BAuA beschreibt die Wirksamkeitskontrolle und das Fortschreiben der Gefährdungsbeurteilung als eigene Prozessschritte.',
    regulatorLabel: 'BAuA: Prozessschritte der Gefährdungsbeurteilung',
    regulatorUrl:
      'https://www.baua.de/DE/Themen/Arbeitsgestaltung/Gefaehrdungsbeurteilung/Handbuch-Gefaehrdungsbeurteilung/Grundlagenwissen/Prozessschritte-der-Gefaehrdungsbeurteilung',
    evidenceTitle: 'Welche zusätzliche Evidenz SignalTrue liefern kann',
    evidencePoints: [
      'Dauerhafte Veränderungen in Meetinglast, Arbeitszeiten und Koordinationsmustern auf Gruppenebene sichtbar machen.',
      'Beobachtungen mit Beschäftigtenfeedback und organisatorischem Kontext verbinden.',
      'Vor Umsetzung einer Maßnahme festhalten, welche Arbeitsmuster sich verändern sollen.',
      'Vorher/Nachher vergleichen und prüfen, ob die Veränderung anhält oder Belastung verlagert wurde.',
    ],
    assessmentTitle: 'Wie belastbar ist Ihre Evidenzkette?',
    assessmentBody:
      'Die kurze Reifegradanalyse zeigt, wie strukturiert Erkennung, Untersuchung, Wirksamkeitskontrolle und Datenschutz zusammenspielen.',
    disclaimer:
      'SignalTrue ersetzt keine Gefährdungsbeurteilung und ist keine Rechtsberatung. Die Plattform liefert ergänzende, aggregierte Arbeitsmuster-Evidenz.',
  },
  '/netherlands/psychosociale-arbeidsbelasting': {
    market: 'netherlands',
    title: 'Psychosociale arbeidsbelasting en RI&E-bewijs | SignalTrue',
    description:
      'Gebruik teamniveau werkpatronen als aanvullende evidence tussen RI&E-momenten en controleer of maatregelen het werk werkelijk veranderden.',
    eyebrow: 'Nederland · psychosociale arbeidsbelasting',
    headline:
      'Een RI&E groeit mee met het bedrijf. Uw bewijs over de werking van maatregelen moet dat ook doen.',
    intro:
      'Arboportaal beschrijft de RI&E als een instrument dat nieuwe en bestaande arbeidsrisico’s in kaart brengt en steeds moet worden bijgewerkt wanneer de organisatie verandert. Werkdruk valt onder psychosociale arbeidsbelasting. SignalTrue voegt een praktische bewijslaag toe tussen meetmomenten: wat veranderde in het werk en werkte de maatregel daarna werkelijk?',
    legalTitle: 'Het uitgangspunt',
    legalBody:
      'Een RI&E bevat een inventarisatie en beoordeling van risico’s plus een plan van aanpak. Arboportaal benadrukt dat de RI&E moet meegroeien met het bedrijf en dat psychosociale arbeidsbelasting, waaronder werkdruk, onderdeel is van de risico-inventarisatie.',
    regulatorLabel: 'Arboportaal: Risico-inventarisatie & evaluatie',
    regulatorUrl:
      'https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/risico-inventarisatie---evaluatie/waaruit-bestaat-de-rie',
    evidenceTitle: 'Wat SignalTrue tussen RI&E-momenten kan toevoegen',
    evidencePoints: [
      'Duurzame veranderingen in vergaderdruk, werk buiten gebruikelijke uren en coördinatie op teamniveau volgen.',
      'Werkpatronen combineren met medewerkersgesprekken en organisatorische context.',
      'Vooraf vastleggen welk effect een maatregel op het werk zou moeten hebben.',
      'Voor en na vergelijken, inclusief de vraag of de belasting naar een ander kanaal, tijdstip of team verschoof.',
    ],
    assessmentTitle: 'Hoe volwassen is uw control-evidence proces?',
    assessmentBody:
      'De korte assessment beoordeelt detectie, onderzoek, verificatie en privacy governance en geeft een score van 0-100.',
    disclaimer:
      'SignalTrue vervangt de RI&E, werknemersraadpleging of arbodeskundige beoordeling niet. Het levert aanvullende, geaggregeerde evidence over werkpatronen.',
  },
};

export default function JurisdictionRiskLanding() {
  const { pathname } = useLocation();
  const config = MARKETS[pathname] || MARKETS['/uk/work-related-stress'];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta title={config.title} description={config.description} path={pathname} />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              {config.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-section font-bold text-[#0F172A] sm:text-display">
              {config.headline}
            </h1>
            <p className="mt-5 max-w-3xl text-body leading-8 text-[#475569]">{config.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/control-evidence-assessment?market=${config.market}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-caption font-bold text-white hover:bg-brand-hover"
              >
                Check your control-evidence maturity
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sample-report"
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 text-caption font-bold text-[#0F172A] hover:border-brand"
              >
                View a sample control review
              </Link>
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-16">
          <div className="container mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-2">
            <div className="rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm">
              <h2 className="text-subsection font-bold text-[#0F172A]">{config.legalTitle}</h2>
              <p className="mt-4 text-caption leading-7 text-[#475569]">{config.legalBody}</p>
              <a
                href={config.regulatorUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-caption font-bold text-brand hover:underline"
              >
                {config.regulatorLabel}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm">
              <h2 className="text-subsection font-bold text-[#0F172A]">{config.evidenceTitle}</h2>
              <div className="mt-5 grid gap-4">
                {config.evidencePoints.map((point) => (
                  <div key={point} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <p className="text-caption leading-6 text-[#475569]">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-14 lg:py-16">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-brand" />
            <h2 className="mt-4 text-section font-bold text-[#0F172A]">{config.assessmentTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-body text-[#475569]">
              {config.assessmentBody}
            </p>
            <Link
              to={`/control-evidence-assessment?market=${config.market}`}
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-control bg-brand px-6 py-3 text-caption font-bold text-white hover:bg-brand-hover"
            >
              Start the assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mx-auto mt-5 max-w-3xl text-caption leading-6 text-[#64748B]">
              {config.disclaimer}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
