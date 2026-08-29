import { Activity, Linkedin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Footer updated per spec:
 * - Team Analytics link added
 * - Blog link maintained
 * - Consistent CTA language
 */

const footerLinks = {
  Product: [
    { label: 'Product', href: '/product' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Sample report', href: '/sample-report' },
    { label: 'Client success process', href: '/client-success' },
    { label: 'Request an evidence review', href: '/contact' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
    { label: 'Resources', href: '/resources' },
    { label: 'Trust centre', href: '/trust' },
  ],
  Trust: [
    { label: 'Trust centre', href: '/trust' },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Responsible-use terms', href: '/terms' },
    { label: 'Australian AI governance', href: '/au/ai-governance' },
  ],
  Guides: [
    { label: 'SignalTrue Australia', href: '/au' },
    { label: 'Monitoring Gap Audit', href: '/au/monitoring-gap-audit' },
    { label: '8-week Australian pilot', href: '/au/8-week-pilot' },
    { label: 'Psychosocial risk monitoring', href: '/au/psychosocial-risk-monitoring' },
    { label: 'Worker consultation indicators', href: '/employee-engagement-leading-indicators' },
    { label: 'Manager capacity', href: '/signals/manager-load' },
    { label: 'Meeting demand', href: '/signals/meeting-overload' },
  ],
};

const Footer = () => {
  return (
    <footer className="py-16 bg-[#0F172A] border-t border-[#334155]">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-control bg-brand flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-lead font-display font-bold text-white">SignalTrue</span>
            </Link>
            <p className="text-[#CBD5E1] text-caption max-w-sm mb-6">
              Early team-level evidence for workplace health, safety and work-design prevention.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/signaltrue"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-control bg-[#1E293B] hover:bg-[#334155] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-[#94A3B8]" />
              </a>
              <a
                href="https://linkedin.com/company/signaltrue"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-control bg-[#1E293B] hover:bg-[#334155] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-[#94A3B8]" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-caption text-[#CBD5E1] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption text-[#94A3B8]">
            © 2026 SignalTrue. Evidence for prevention—not employee monitoring.
          </p>
          <p className="text-caption text-[#94A3B8]">
            Signals support consultation; they do not diagnose.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
