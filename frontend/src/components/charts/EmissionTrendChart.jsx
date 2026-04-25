import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs space-y-1">
      <p style={{ color: 'var(--muted)' }} className="font-mono">{label}</p>
      <p className="readout font-bold text-green-400">{payload[0]?.value?.toFixed(1)} kg/ha</p>
      {payload[1] && <p className="readout text-yellow-400">{payload[1].value} scans</p>}
    </div>
  )
}

export default function EmissionTrendChart({ data = [], height = 220 }) {
  const fmt = data.map(d => ({
    ...d,
    label: (() => { try { return format(parseISO(d.date), 'MMM d') } catch { return d.date } })()
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={fmt} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(34,197,94,0.07)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#6b8c72', fontSize: 10, fontFamily: 'Space Mono' }}
          axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#6b8c72', fontSize: 10, fontFamily: 'Space Mono' }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <ReferenceLine y={1500} stroke="#fbbf24" strokeDasharray="5 3" strokeWidth={1}
          label={{ value: 'Warning', fill: '#fbbf24', fontSize: 9, fontFamily: 'Space Mono' }} />
        <ReferenceLine y={3000} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1}
          label={{ value: 'Critical', fill: '#ef4444', fontSize: 9, fontFamily: 'Space Mono' }} />
        <Area type="monotone" dataKey="avg_carbon" name="Carbon (kg/ha)"
          stroke="#22c55e" strokeWidth={2} fill="url(#carbonGrad)"
          dot={false} activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
