import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ConversionRate } from '@/types/sales';
import { STAGE_CONFIG } from '@/lib/sales-utils';
import { motion } from 'framer-motion';

interface ConversionFunnelProps {
  conversions: ConversionRate[];
}

export function ConversionFunnel({ conversions }: ConversionFunnelProps) {
  const data = conversions.map(c => ({
    name: `${STAGE_CONFIG[c.from as keyof typeof STAGE_CONFIG].label} → ${STAGE_CONFIG[c.to as keyof typeof STAGE_CONFIG].label}`,
    rate: Math.round(c.rate),
    from: c.from
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-6 shadow-lg shadow-black/40"
    >
      <h3 className="text-xl font-bold text-white mb-6">Conversion Rates</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="rgba(255,255,255,0.4)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            width={150}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: 'white'
            }}
            formatter={(value: number) => [`${value}%`, 'Conversion Rate']}
          />
          <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STAGE_CONFIG[entry.from as keyof typeof STAGE_CONFIG].color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
