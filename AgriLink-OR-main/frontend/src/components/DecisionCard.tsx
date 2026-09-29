import React from 'react';
import { MapPin, Clock, PackageCheck, ArrowRight, ShieldCheck } from 'lucide-react';

interface DecisionCardProps {
  letter: string;
  tag: string;
  title: string;
  cardTitle: string;
  cardValue: string;
  cardDelta: string;
  cardNote: string;
  module: string;
  iconName: string;
  problem: string;
  solution: string;
  onExplore?: () => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  letter,
  tag,
  title,
  cardTitle,
  cardValue,
  cardDelta,
  cardNote,
  module,
  iconName,
  problem,
  solution,
  onExplore
}) => {
  const renderIcon = () => {
    switch (iconName) {
      case 'MapPin':
        return <MapPin className="w-5 h-5 text-crimson-brand" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-crimson-brand" />;
      case 'PackageCheck':
        return <PackageCheck className="w-5 h-5 text-crimson-brand" />;
      default:
        return <MapPin className="w-5 h-5 text-crimson-brand" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between">
      
      {/* Signature Red Left Border Rule */}
      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-crimson-brand to-crimson-400" />

      <div className="p-6 pl-7">
        
        {/* Header Tag + Letter */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-crimson-50 border border-crimson-roseBorder flex items-center justify-center">
              {renderIcon()}
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-crimson-brand">
              {tag}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            {letter}
          </span>
        </div>

        {/* Commercial Title */}
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-xs font-semibold text-slate-500 mb-4">
          {module}
        </p>

        {/* Real Computed Result Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{cardTitle}</span>
            <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Optimal
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
            {cardValue}
          </div>
          <div className="text-xs font-bold text-crimson-brand mt-1 flex items-center gap-1">
            <span>{cardDelta}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 border-t border-slate-200/60 pt-2 font-mono">
            {cardNote}
          </div>
        </div>

        {/* Operational Problem & Solution */}
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-900 font-semibold">The Problem: </strong>
            {problem}
          </p>
          <p className="bg-crimson-50/40 p-2.5 rounded-lg border border-crimson-roseBorder/40">
            <strong className="text-crimson-brand font-semibold">The OR Solution: </strong>
            {solution}
          </p>
        </div>

      </div>

      {/* Card Action */}
      <div className="px-6 pl-7 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-500">Pure Function · No ML</span>
        {onExplore && (
          <button
            onClick={onExplore}
            className="text-xs font-bold text-crimson-brand hover:text-crimson-brandDark inline-flex items-center gap-1 group"
          >
            <span>Inspect Module</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

    </div>
  );
};
