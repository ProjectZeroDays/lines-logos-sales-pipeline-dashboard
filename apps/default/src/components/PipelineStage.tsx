import { motion } from 'framer-motion';
import type { StageMetrics } from '@/types/sales';
import { STAGE_CONFIG, formatCurrency } from '@/lib/sales-utils';
import { ChevronRight } from 'lucide-react';

interface PipelineStageProps {
  metrics: StageMetrics;
  index: number;
  onClick?: () => void;
}

export function PipelineStage({ metrics, index, onClick }: PipelineStageProps) {
  const config = STAGE_CONFIG[metrics.stage as keyof typeof STAGE_CONFIG];
  const hasDeals = metrics.count > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${config.label} deals`}
      className="group relative cursor-pointer"
    >
      <div className="card-shimmer relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-6 hover:bg-white/10 transition-colors duration-200">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{config.label}</h3>
            <p className="text-sm text-white/60">{metrics.count} {metrics.count === 1 ? 'deal' : 'deals'}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {formatCurrency(metrics.value)}
            </span>
          </div>
          
          {hasDeals && (
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((metrics.count / 5) * 100, 100)}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
              />
            </div>
          )}
        </div>
        
      </div>
    </motion.div>
  );
}
