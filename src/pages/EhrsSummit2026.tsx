import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CheckCircle, ArrowDown } from 'lucide-react';

// Analytics tracking
const trackEvent = (eventName: string, params?: Record<string, string>) => {
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
  // Meta Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, params);
  }
  // LinkedIn Insight Tag
  if (typeof window !== 'undefined' && (window as any).lintrk) {
    (window as any).lintrk('track', { conversion_id: eventName });
  }
};

const EhrsSummit2026: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    organization: '',
    email: '',
    challenge: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize tracking pixels on page load
  useEffect(() => {
    trackEvent('EHRS_page_view');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const scrollToForm = () => {
    const formSection = document.getElementById('form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Track form submission
      trackEvent('EHRS_form_submit', {
        organization: formData.organization,
      });

      // Submit to backend CRM with EHRS2026 tag
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'EHRS2026',
          tag: 'EHRS2026',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail - still show success to user
        console.log('Lead submission endpoint not available');
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitted(true); // Still show success for UX
    } finally {
      setLoading(false);
    }
  };

  // Thank you state
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Täname!</h1>
          <p className="text-lg text-gray-600 mb-8">Võtame sinuga ühendust 48 tunni jooksul.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            ← Tagasi avalehele
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Section 1 – Hero */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-8">
            SignalTrue ei küsi, kas inimesed on väsinud.
            <br />
            <span className="text-blue-600">
              Ta näitab, millal töökorraldus hakkab neid üle koormama.
            </span>
          </h1>

          {/* Subheadline */}
          <div className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed space-y-1">
            <p>Enne kui rahuloluküsitlused muutuvad punaseks.</p>
            <p>Enne kui fookus kaob.</p>
            <p>Enne kui tekivad vaiksed lahkumised.</p>
          </div>

          {/* Supporting paragraph */}
          <div className="text-base sm:text-lg text-gray-700 mb-10 max-w-3xl leading-relaxed">
            <p className="mb-4">
              SignalTrue analüüsib töömetaandmeid (kalendrid, koostöökoormus, fookuse killustumine)
              ja annab juhile iganädalase varajase signaali süsteemsest ülekoormusest.
            </p>
            <p className="text-gray-600">
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg font-medium transition-colors"
            size="lg"
          >
            👉 Soovin lühikest ülevaadet
            <ArrowDown className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Section 2 – Problem Trigger */}
      <section className="px-6 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-10">
            Kas sul on täna objektiivne viis näha, millal meeskonna koormus hakkab vaikselt
            kontrolli alt väljuma?
          </h2>

          <ul className="space-y-4 text-lg text-gray-700 mb-10">
            <li className="flex items-start">
              <span className="text-gray-400 mr-3">•</span>
              <span>Kalendrid on täis, aga töö ei liigu kiiremini</span>
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-3">•</span>
              <span>Koosolekuid on rohkem, otsuseid vähem</span>
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-3">•</span>
              <span>Pingutus kasvab, tulemus mitte</span>
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-3">•</span>
              <span>Rahuloluküsitlused ütlevad "pigem hästi", aga tunnetus ütleb muud</span>
            </li>
          </ul>

          <div className="text-lg text-gray-800 font-medium border-l-4 border-blue-600 pl-6">
            <p>Meeleolu on hiline näitaja.</p>
            <p className="text-blue-600">Käitumuslikud mustrid muutuvad varem.</p>
          </div>
        </div>
      </section>

      {/* Section 3 – What Makes It Different */}
      <section className="px-6 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-8">
            Mitte veel üks küsitlus.
            <br />
            <span className="text-blue-600">Vaid käitumuslik varajane hoiatussüsteem.</span>
          </h2>

          <div className="text-lg text-gray-700 leading-relaxed">
            <p className="mb-6">
              SignalTrue tuvastab organisatsioonis "käitumusliku kõrvalekalde" – hetke, kus
              töödisain, koostööintensiivsus ja fookuse killustumine tõstab süsteemselt stressi.
            </p>
            <p className="text-gray-600">
              See ei mõõda arvamusi.
              <br />
              <strong className="text-gray-800">See mõõdab mustrit.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 – Value to HR Leaders */}
      <section className="px-6 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-10">
            Mida see juhile annab?
          </h2>

          <ul className="space-y-4 text-lg text-gray-700 mb-10">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Iganädalane varajane signaal võimaliku ülekoormuse kohta</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Meeskondade võrdlev pilt ilma isikupõhise jälgimiseta</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Andmepõhine alus otsustele (koosolekukoormus, prioriteedid, fookus)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Võimalus reageerida 4–8 nädalat enne nähtavaid probleeme</span>
            </li>
          </ul>

          <div className="text-lg text-gray-800 font-medium border-l-4 border-blue-600 pl-6">
            <p>Läbipõlemine ei alga aususest.</p>
            <p className="text-blue-600">Ta algab vastupidamisest.</p>
          </div>
        </div>
      </section>

      {/* Section 5 – Form Block */}
      <section id="form-section" className="px-6 py-20 lg:py-28">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Soovid näha, kuidas SignalTrue sinu organisatsioonis töötaks?
            </h2>
            <p className="text-lg text-gray-600">
              Jäta oma kontakt ja saad lühikese, konkreetse 15-min ülevaate, kas ja kuidas see
              annaks sinu organisatsioonile reaalse eelise.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nimi */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nimi <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="Sinu nimi"
              />
            </div>

            {/* Ametinimetus */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Ametinimetus <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="Nt. HR juht, Personalidirektor"
              />
            </div>

            {/* Organisatsioon */}
            <div>
              <label
                htmlFor="organization"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Organisatsioon <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="organization"
                name="organization"
                required
                value={formData.organization}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="Ettevõtte nimi"
              />
            </div>

            {/* E-post */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                E-post <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="sinu@ettevote.ee"
              />
            </div>

            {/* Peamine väljakutse (Optional) */}
            <div>
              <label htmlFor="challenge" className="block text-sm font-medium text-gray-700 mb-1.5">
                Peamine väljakutse <span className="text-gray-400 font-normal">(valikuline)</span>
              </label>
              <Textarea
                id="challenge"
                name="challenge"
                rows={3}
                value={formData.challenge}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
                placeholder="Mis on sinu organisatsioonis hetkel suurim väljakutse?"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {loading ? 'Saadan...' : '👉 Soovin ülevaadet'}
            </Button>
          </form>

          {/* Privacy Policy Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Esitades vormi, nõustud meie{' '}
            <Link to="/app/privacy" className="text-blue-600 hover:underline">
              privaatsuspoliitikaga
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Minimal Footer - Privacy Policy only */}
      <footer className="px-6 py-8 border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <Link to="/app/privacy" className="text-sm text-gray-500 hover:text-gray-700">
            Privaatsuspoliitika
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default EhrsSummit2026;
