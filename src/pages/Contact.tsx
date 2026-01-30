import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, Calendar, Building2, Send, CheckCircle } from 'lucide-react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate submission - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions about SignalTrue? Want to see how behavioral intelligence 
              can transform your team? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Email Us</h3>
              <p className="text-muted-foreground text-sm mb-3">For general inquiries</p>
              <a 
                href="mailto:hello@signaltrue.ai" 
                className="text-primary hover:underline font-medium"
              >
                hello@signaltrue.ai
              </a>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Book a Demo</h3>
              <p className="text-muted-foreground text-sm mb-3">See SignalTrue in action</p>
              <Link 
                to="/demo" 
                className="text-primary hover:underline font-medium"
              >
                Schedule a call
              </Link>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Support</h3>
              <p className="text-muted-foreground text-sm mb-3">For existing customers</p>
              <a 
                href="mailto:support@signaltrue.ai" 
                className="text-primary hover:underline font-medium"
              >
                support@signaltrue.ai
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Message Sent!</h2>
                  <p className="text-muted-foreground mb-6">
                    Thanks for reaching out. We'll get back to you within 24 hours.
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
                    <h2 className="text-2xl font-bold text-foreground mb-2">Send Us a Message</h2>
                    <p className="text-muted-foreground">
                      Fill out the form below and we'll get back to you shortly.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                          Your Name *
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
                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                          Work Email *
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
                        <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
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
                        <label htmlFor="teamSize" className="block text-sm font-medium text-foreground mb-2">
                          Team Size
                        </label>
                        <select
                          id="teamSize"
                          name="teamSize"
                          value={formData.teamSize}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                        >
                          <option value="">Select team size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors resize-none"
                        placeholder="Tell us about your needs..."
                      />
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
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Not sure where to start?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Take our free Behavioral Drift Diagnostic to see where your team stands 
            — no signup required.
          </p>
          <Link
            to="/drift-diagnostic"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:bg-accent/90 transition-colors"
          >
            Take Free Diagnostic
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Contact;
