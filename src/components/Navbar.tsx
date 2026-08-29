import { Activity, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { PrimaryCommercialCTA } from './CommercialCTA';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * Navigation reflects core product flow per spec:
 * Product → How It Works → Pricing → About → Blog
 * Primary CTA: Request Early Signal Preview
 * No "Free Diagnostic" - simplified per spec
 */

const navItems = [
  { label: 'Product', href: '/product' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Trust', href: '/trust' },
];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isAustralia = pathname === '/au' || pathname.startsWith('/au/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-control bg-brand flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-lead font-display font-bold text-[#0F172A]">SignalTrue</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="px-4 py-2 text-caption font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <span className="inline-flex h-9 items-center rounded-control px-3 text-caption font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]">
                Sign in
              </span>
            </Link>
            {isAustralia ? (
              <>
                <Link
                  to="/au/8-week-pilot"
                  className="inline-flex h-9 items-center rounded-control px-3 text-caption font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  8-week pilot
                </Link>
                <Link
                  to="/au/monitoring-gap-audit"
                  className="inline-flex h-9 items-center rounded-control bg-brand px-4 text-caption font-semibold text-white shadow-sm hover:bg-brand-hover"
                >
                  Run the audit
                </Link>
              </>
            ) : (
              <PrimaryCommercialCTA
                ctaLocation="navbar_desktop"
                className="inline-flex h-9 items-center rounded-control bg-brand px-4 text-caption font-semibold text-white shadow-sm hover:bg-brand-hover"
              >
                Book a walkthrough
              </PrimaryCommercialCTA>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[#0F172A]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden mt-4 pb-4 border-t border-[#E2E8F0] pt-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="px-4 py-3 text-caption font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-control transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 px-4">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <span className="flex w-full items-center justify-center rounded-control px-4 py-3 text-caption font-semibold text-[#475569]">
                    Sign in
                  </span>
                </Link>
                {isAustralia ? (
                  <>
                    <Link
                      to="/au/8-week-pilot"
                      className="flex w-full items-center justify-center rounded-control px-4 py-3 text-caption font-semibold text-[#475569]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      View the 8-week pilot
                    </Link>
                    <Link
                      to="/au/monitoring-gap-audit"
                      className="flex w-full items-center justify-center rounded-control bg-brand px-4 py-3 text-center text-caption font-semibold text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Run the Monitoring Gap Audit
                    </Link>
                  </>
                ) : (
                  <PrimaryCommercialCTA
                    ctaLocation="navbar_mobile"
                    className="flex w-full items-center justify-center rounded-control bg-brand px-4 py-3 text-center text-caption font-semibold text-white"
                    onClick={() => {
                      setMobileMenuOpen(false);
                    }}
                  >
                    Book a walkthrough
                  </PrimaryCommercialCTA>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
