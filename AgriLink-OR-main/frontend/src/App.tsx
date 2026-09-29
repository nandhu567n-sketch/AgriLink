import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { DataCoveragePage } from './pages/DataCoveragePage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactPage } from './pages/ContactPage';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState<string>('home');

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      
      {/* Top Engineering & Provenance Announcement Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-slate-200 font-medium">
              AgriLink-OR v2.0: Pure Operations Research Engine
            </span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="hidden sm:inline text-emerald-400 font-mono font-semibold">
              50 / 50 Tests Passing
            </span>
            <span className="hidden md:inline text-slate-500">·</span>
            <span className="hidden md:inline text-crimson-400 font-mono font-bold">
              ZERO MACHINE LEARNING
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Unified Production UI :5173</span>
            </span>
            <span className="text-slate-600">|</span>
            <a 
              href="http://localhost:8000/docs" 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>FastAPI :8000/docs</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Page Content Viewport */}
      <main className="flex-1">
        {activePage === 'home' && <HomePage setActivePage={setActivePage} />}
        {activePage === 'methodology' && <MethodologyPage />}
        {activePage === 'data' && <DataCoveragePage />}
        {activePage === 'architecture' && <ArchitecturePage />}
        {activePage === 'api' && <ApiDocsPage />}
        {activePage === 'dashboard' && <DashboardPage />}
        {activePage === 'contact' && <ContactPage />}
      </main>

      {/* Footer */}
      <Footer setActivePage={setActivePage} />

    </div>
  );
}

export default App;
