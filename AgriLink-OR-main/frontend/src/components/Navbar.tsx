import React, { useState } from 'react';
import { Menu, X, CheckCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { SITE_STATS } from '../data/siteData';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setActivePage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'methodology', label: 'Methodology (3 W\'s)' },
    { id: 'data', label: 'Data & Coverage' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'api', label: 'API Docs' },
    { id: 'dashboard', label: 'Try Dashboard' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNav = (id: string) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => handleNav('home')}
          >
            <div className="w-9 h-9 rounded-lg bg-crimson-brand flex items-center justify-center text-white shadow-sm shadow-crimson-200 group-hover:bg-crimson-brandDark transition-colors">
              <span className="text-xl font-black">🌾</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">AgriLink</span>
                <span className="text-crimson-brand font-black text-xl tracking-tight">-OR</span>
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-crimson-50 text-crimson-brand border border-crimson-roseBorder">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-tight">
                Deterministic Decision Support for FPOs
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  activePage === link.id
                    ? 'text-crimson-brand bg-crimson-50 border border-crimson-roseBorder/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Status Badge + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{SITE_STATS.testsPassing} Tests</span>
              <span className="text-emerald-400">·</span>
              <span className="text-crimson-brand font-bold">0% ML</span>
            </div>

            <button
              onClick={() => handleNav('dashboard')}
              className="inline-flex items-center gap-1.5 bg-crimson-brand hover:bg-crimson-brandDark text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm shadow-crimson-200 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</span>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>43 Tests · Pure Maths</span>
            </div>
          </div>
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-base font-semibold transition-colors ${
                activePage === link.id
                  ? 'text-crimson-brand bg-crimson-50 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => handleNav('dashboard')}
              className="w-full flex items-center justify-center gap-2 bg-crimson-brand text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow"
            >
              <span>Open the Live Dashboard</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
