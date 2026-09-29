import React from 'react';
import { ArrowRight, Database, TrendingUp, Compass, Clock, PackageCheck } from 'lucide-react';
import { PIPELINE_STAGES } from '../data/siteData';

export const PipelineStep: React.FC = () => {
  const getIcon = (step: string) => {
    switch (step) {
      case '01':
        return <Database className="w-4 h-4 text-crimson-brand" />;
      case '02':
        return <TrendingUp className="w-4 h-4 text-crimson-brand" />;
      case '03':
        return <Compass className="w-4 h-4 text-crimson-brand" />;
      case '04':
        return <Clock className="w-4 h-4 text-crimson-brand" />;
      case '05':
        return <PackageCheck className="w-4 h-4 text-crimson-brand" />;
      default:
        return <Database className="w-4 h-4 text-crimson-brand" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4 pt-1">
      <div className="min-w-[860px] flex items-stretch gap-2.5">
        {PIPELINE_STAGES.map((stage, idx) => (
          <React.Fragment key={stage.step}>
            
            {/* Step Card */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-crimson-roseBorder transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="w-6 h-6 rounded-md bg-crimson-50 border border-crimson-roseBorder/60 flex items-center justify-center">
                    {getIcon(stage.step)}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    STAGE {stage.step}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-crimson-brand transition-colors">
                  {stage.name}
                </h4>
                
                <code className="block text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 my-1.5 truncate">
                  {stage.code}
                </code>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {stage.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-crimson-brand font-mono">
                <span>{stage.stat}</span>
              </div>
            </div>

            {/* Connecting Arrow */}
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="flex items-center justify-center text-slate-300">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}

          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
