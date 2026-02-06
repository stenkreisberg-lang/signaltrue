import { Activity, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

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
    { label: "How It Works", href: "/how-it-works" },
    { label: "Product", href: "/product" },
    { label: "Team Analytics", href: "/team-analytics" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" }
  ],
  Resources: [
    { label: "Privacy", href: "/trust" },
    { label: "Terms of Service", href: "/about#terms" }
  ],
};

const Footer = () => {
  return (
    <footer className="py-16 bg-card border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">
                SignalTrue
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              Behavioral Drift Intelligence. Detect organizational strain early 
              by observing how work actually happens, without surveillance or surveys.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com/signaltrue" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href="https://linkedin.com/company/signaltrue" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display font-semibold text-foreground mb-4">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.href} 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 SignalTrue. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Behavioral Early-Warning System for modern organizations.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
