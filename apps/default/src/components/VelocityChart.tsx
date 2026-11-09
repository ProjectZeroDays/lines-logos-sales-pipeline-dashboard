import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { StageMetrics } from '@/types/sales';
import { STAGE_CONFIG, formatCurrency } from '@/lib/sales-utils';

interface VelocityChartProps {
  stages: StageMetrics[];
}

// Deal value in each stage, computed from the deals project (no invented history).
export function VelocityChart({ stages }: VelocityChartProps) {
  const data = stages.map((s) => ({
    stage: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG]?.label ?? s.stage,
    value: s.value,
    count: s.count,
    color: STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG]?.color ?? '#64748b',
  }));
  const hasData = data.some((d) => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 shadow-lg shadow-black/40"
    >
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">Value by Stage</h3>
        <p className="text-sm text-white/60 mt-1">Total deal value in each stage</p>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="stage"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={56}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              width={56}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
              formatter={(value: number, _name: string, item: { payload?: { count?: number } }) => [
                `${formatCurrency(value)} (${item.payload?.count ?? 0} ${item.payload?.count === 1 ? 'deal' : 'deals'})`,
                'Value',
              ]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.stage} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-16 text-center text-sm text-white/60">Add a deal with a value to see this chart.</p>
      )}
    </motion.div>
  );
}
