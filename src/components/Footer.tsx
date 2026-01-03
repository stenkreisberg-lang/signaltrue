import { Activity, Linkedin, Twitter } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "Security"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Resources: ["Documentation", "Help Center", "Privacy Policy", "Terms of Service"],
};

const Footer = () => {
  return (
    <footer className="py-16 bg-card border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">
                SignalTrue
              </span>
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              Helping HR leaders detect early warning signs and prevent burnout 
              before it impacts your team's performance and retention.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="#" 
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href="#" 
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
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
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
            Made with care for HR teams everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
