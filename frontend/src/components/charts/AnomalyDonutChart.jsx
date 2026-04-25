import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  'Normal': '#22c55e', 'Water Stress': '#38bdf8',
  'Pest Infestation': '#f97316', 'Nutrient Deficiency': '#a78bfa',
  'Flood / Waterlogging': '#60a5fa',
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs">
      <p style={{ color: COLORS[payload[0].name] || '#fff' }} className="font-medium">{payload[0].name}</p>
      <p style={{ color: 'var(--muted)' }} className="readout">{payload[0].value} occurrences</p>
    </div>
  )
}

export default function AnomalyDonutChart({ distribution = {}, height = 220 }) {
  const data = Object.entries(distribution).map(([name, value]) => ({ name, value }))
  if (!data.length) return (
    <div className="flex items-center justify-center text-sm" style={{ height, color: 'var(--muted)' }}>
      No data yet
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
          paddingAngle={3} dataKey="value">
          {data.map(e => <Cell key={e.name} fill={COLORS[e.name] || '#6b8c72'} stroke="transparent" />)}
        </Pie>
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" iconSize={7}
          formatter={v => <span style={{ color: '#6b8c72', fontSize: 10, fontFamily: 'Space Mono' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}
