import { Button } from '../components/ui/button';
import { Activity, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { trackEvent } from '../lib/analytics';

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
  { label: 'Privacy', href: '/trust' },
];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRequestDemo = () => {
    trackEvent('demo_requested');
  };

  const handleSampleReport = () => {
    trackEvent('sample_report_click');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0]">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-display font-bold text-[#0F172A]">SignalTrue</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="px-4 py-2 text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-[#475569] hover:text-[#0F172A]">
                Login
              </Button>
            </Link>
            <Link to="/product#sample-report" onClick={handleSampleReport}>
              <Button variant="ghost" size="sm" className="text-[#475569] hover:text-[#0F172A]">
                Sample report
              </Button>
            </Link>
            <Link to="/contact" onClick={handleRequestDemo}>
              <Button variant="cta" size="sm">
                Request demo
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[#0F172A]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-[#E2E8F0] pt-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="px-4 py-3 text-sm font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 px-4">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full text-[#475569]">
                    Login
                  </Button>
                </Link>
                <Link
                  to="/product#sample-report"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSampleReport();
                  }}
                >
                  <Button variant="ghost" size="sm" className="w-full text-[#475569]">
                    Sample report
                  </Button>
                </Link>
                <Link
                  to="/contact"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleRequestDemo();
                  }}
                >
                  <Button variant="cta" size="sm" className="w-full">
                    {' '}
                    Request demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
