import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, Calendar, Building2, Send, CheckCircle } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    companySize: '',
    mainProblem: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    trackEvent('contact_form_submit', {
      company_size: formData.companySize || undefined,
      problem_area: formData.mainProblem || undefined,
      source_page: window.location.pathname,
    });

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-20 pb-12 bg-hero-gradient relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              See work-system pressure before it becomes disruption.
            </h1>
            <p className="text-xl text-muted-foreground">
              Request a guided review of capacity, coordination, and recovery signals generated from
              metadata only, without reading employee messages.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">General inquiries</h3>
              <p className="text-muted-foreground text-sm mb-3">For general inquiries</p>
              <a
                href="mailto:hello@signaltrue.ai"
                onClick={() => trackEvent('contact_mailto_click', { email_type: 'general' })}
                className="text-primary hover:underline font-medium"
              >
                hello@signaltrue.ai
              </a>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Product demonstration</h3>
              <p className="text-muted-foreground text-sm mb-3">See SignalTrue in action</p>
              <Link to="/demo" className="text-primary hover:underline font-medium">
                Schedule a call
              </Link>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Customer support</h3>
              <p className="text-muted-foreground text-sm mb-3">For existing customers</p>
              <a
                href="mailto:support@signaltrue.ai"
                onClick={() => trackEvent('contact_mailto_click', { email_type: 'support' })}
                className="text-primary hover:underline font-medium"
              >
                support@signaltrue.ai
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Thanks. We received your request.
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We will contact you about SignalTrue and share the next step for a demo or
                    workload scan.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <p className="text-xs uppercase tracking-widest font-semibold text-primary mb-3">
                      Request a demo
                    </p>
                    <h2 className="text-2xl font-bold text-foreground mb-2">What we will cover</h2>
                    <ul className="text-muted-foreground text-sm space-y-1 mt-4 text-left max-w-sm mx-auto">
                      {[
                        'What SignalTrue detects',
                        'What data it uses',
                        'What it does not collect',
                        'How privacy is protected',
                        'What a weekly signal report looks like',
                        'How manager overload is detected',
                        'How recommendations work',
                        'What a pilot or workload scan could look like',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          Work email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                          placeholder="jane@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          Company
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            id="company"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                            placeholder="Acme Inc."
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="role"
                          className="block text-sm font-medium text-foreground mb-2"
                        >
                          Role
                        </label>
                        <input
                          type="text"
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                          placeholder="e.g. HR Director, COO"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="companySize"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Company size
                      </label>
                      <select
                        id="companySize"
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                      >
                        <option value="">Select company size</option>
                        <option value="under-50">Under 50</option>
                        <option value="50-150">50 to 150</option>
                        <option value="151-500">151 to 500</option>
                        <option value="501-2500">501 to 2,500</option>
                        <option value="2500+">2,500+</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="mainProblem"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Main problem you want to understand
                      </label>
                      <select
                        id="mainProblem"
                        name="mainProblem"
                        value={formData.mainProblem}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                      >
                        <option value="">Select a problem area</option>
                        <option value="manager-overload">Manager overload</option>
                        <option value="too-many-meetings">Too many meetings</option>
                        <option value="focus-fragmentation">Focus fragmentation</option>
                        <option value="response-pressure">Response pressure</option>
                        <option value="burnout-risk">Burnout risk</option>
                        <option value="employee-engagement">Employee engagement</option>
                        <option value="delivery-slowing">Delivery slowing down</option>
                        <option value="not-sure">Not sure yet</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Request demo
                        </>
                      )}
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                      We will only use your information to contact you about SignalTrue.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
