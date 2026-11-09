import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  subtitle?: string;
}

export function MetricCard({ title, value, change, changeType = 'neutral', icon: Icon, subtitle }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-shimmer relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-6 shadow-lg shadow-black/40"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/60 mb-1">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1 tabular-nums">{value}</h3>
          {subtitle && (
            <p className="text-xs text-white/40">{subtitle}</p>
          )}
        </div>
        <div className="hidden sm:block rounded-xl bg-white/5 p-3">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
      </div>
      
      {change && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-green-400' :
            changeType === 'negative' ? 'text-red-400' :
            'text-white/60'
          }`}>
            {change}
          </span>
        </div>
      )}
      
    </motion.div>
  );
}
