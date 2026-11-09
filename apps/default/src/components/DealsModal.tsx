import { X, Building2, User, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StageMetrics } from '@/types/sales';
import { STAGE_CONFIG, formatCurrency, formatPercent } from '@/lib/sales-utils';

interface DealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageMetrics: StageMetrics | null;
}

export function DealsModal({ isOpen, onClose, stageMetrics }: DealsModalProps) {
  if (!stageMetrics) return null;

  const config = STAGE_CONFIG[stageMetrics.stage as keyof typeof STAGE_CONFIG];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-white/10 shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden pointer-events-auto">
              {/* Header */}
              <div className="border-b border-white/10 p-6 bg-white/5 backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{config.label}</h2>
                      <p className="text-sm text-white/60">
                        {stageMetrics.count} deals • {formatCurrency(stageMetrics.value)} total
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Deals List */}
              <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
                {stageMetrics.deals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/40">No deals in this stage yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stageMetrics.deals.map((deal) => (
                      <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                      >
                        <div className="space-y-4">
                          {/* Deal Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                                {deal.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4" />
                                  <span>{deal.company}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <User className="w-4 h-4" />
                                  <span>{deal.contact}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white mb-1">
                                {formatCurrency(deal.value)}
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-white/60">
                                <TrendingUp className="w-4 h-4" />
                                <span>{formatPercent(deal.probability * 100)} probability</span>
                              </div>
                            </div>
                          </div>

                          {/* Deal Metrics */}
                          <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-lg bg-white/5 text-xs font-medium text-white/80 capitalize">
                                {deal.source}
                              </span>
                            </div>
                            
                            {/* Weighted Value */}
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              <span>Weighted:</span>
                              <span className="font-semibold text-cyan-400">
                                {formatCurrency(deal.value * deal.probability)}
                              </span>
                            </div>
                          </div>

                          {/* Probability Bar */}
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${deal.probability * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                          </div>
                        </div>

                        {/* Decorative Element */}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 p-6 bg-white/5 backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">
                    Total weighted value: <span className="font-semibold text-white">
                      {formatCurrency(
                        stageMetrics.deals.reduce((sum, d) => sum + (d.value * d.probability), 0)
                      )}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
