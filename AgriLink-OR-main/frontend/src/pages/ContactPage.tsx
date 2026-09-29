import React, { useState } from 'react';
import { Mail, Building2, MapPin, Send, CheckCircle2, ShieldCheck, FileText, PhoneCall } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fpoName: '',
    contactPerson: '',
    email: '',
    phone: '',
    districtState: '',
    primaryCrop: 'Onion',
    annualVolumeQtl: '2000',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson-50 border border-crimson-roseBorder mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
            FPO Deployment &amp; Audit Verification
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Partner with AgriLink-OR
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          Whether you are an active Farmer Producer Organisation looking to calibrate contract freight rates, an agricultural lender auditing e-NWR break-even models, or a state ag-tech mission, we provide full access to our operations research suite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Contact Info & Credentials */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900">
              Cooperative Deployment Support
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              We help FPOs configure their own custom <code>data/ref/params.yaml</code> file with verified local diesel costs, warehouse quotes, and APMC cess percentages.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-crimson-brand flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Reference Procurement Hub:</strong>
                  <span className="text-slate-600 font-mono">Davangere FPO Hub, Karnataka (14.30°N, 76.00°E)</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-crimson-brand flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">National Fact Table:</strong>
                  <span className="text-slate-600 font-mono">727,050 records · 26 states · 1,611 mandis</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-crimson-brand flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Direct Engineering Inquiry:</strong>
                  <span className="text-slate-600 font-mono">engineering@agrilink-or.org</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-xs font-mono text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Machine Learning · Pure Traceability</span>
              </div>
              <div>43 unit tests passing in automated CI/CD</div>
              <div>FastAPI backend + Streamlit decision terminal</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-crimson-brand" />
              Technical Whitepaper
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Download the formal operations-research specification: mathematical formulations for LOESS STL, Net-In-Hand Realisation (NIHR), multi-tranche CBC MILP, and Bounded Knapsack with 0/1 Subset-Sum DP.
            </p>
            <a
              href="#whitepaper"
              onClick={(e) => { e.preventDefault(); alert("REPORT.md and explain.md contain the complete technical whitepaper in the repository."); }}
              className="text-xs font-bold text-crimson-brand hover:underline inline-flex items-center gap-1 font-mono"
            >
              <span>View REPORT.md in Repository</span>
            </a>
          </div>
        </div>

        {/* FPO Intake Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Request Registered</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{formData.contactPerson}</strong>. Our quantitative operations team will prepare custom <code>params.yaml</code> freight calibration presets for <strong>{formData.fpoName}</strong>.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  FPO Pilot Onboarding &amp; Rate Calibration
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in your cooperative's details to evaluate spatial arbitrage or simulate warehouse hold-vs-sell for your region.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">FPO / Cooperative Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tungabhadra Farmers Producer Co."
                    value={formData.fpoName}
                    onChange={(e) => setFormData({ ...formData, fpoName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="CEO / Managing Director"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="fpo@cooperative.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">District &amp; State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Davangere, Karnataka"
                    value={formData.districtState}
                    onChange={(e) => setFormData({ ...formData, districtState: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Storable Commodity *</label>
                  <select
                    value={formData.primaryCrop}
                    onChange={(e) => setFormData({ ...formData, primaryCrop: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                  >
                    <option value="Onion">Onion (Full 2-Year Annual Cycle)</option>
                    <option value="Potato">Potato (Full 2-Year Annual Cycle)</option>
                    <option value="Tomato">Tomato (Spatial Arbitrage Only)</option>
                    <option value="Wheat">Wheat (Spatial Arbitrage Only)</option>
                    <option value="Rice">Rice (Spatial Arbitrage Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Estimated Seasonal Batch Volume (Quintals)</label>
                <input
                  type="text"
                  placeholder="e.g. 500 qtl (5 trucks)"
                  value={formData.annualVolumeQtl}
                  onChange={(e) => setFormData({ ...formData, annualVolumeQtl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Specific Logistics Constraints or Warehouse Inquiries</label>
                <textarea
                  rows={3}
                  placeholder="e.g. We have negotiated a local truck rate of ₹28/km and warehouse storage at ₹5.5/qtl/month. Can we test interstate sale to Pune?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-crimson-brand hover:bg-crimson-brandDark text-white py-3.5 px-6 rounded-xl font-extrabold text-sm shadow-sm shadow-crimson-200 transition-all hover:shadow hover:-translate-y-0.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit FPO Calibration Request</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center font-mono">
                AgriLink-OR is open source and reproducible. Data submitted is confidential.
              </p>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
