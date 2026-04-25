import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'

export function Card({ children, className = '', glow = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('glass p-5 relative overflow-hidden', glow && 'glow', className)}
    >
      <div className="absolute top-0 left-0 w-10 h-10 pointer-events-none opacity-20">
        <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
          <path d="M2 2L16 2" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M2 2L2 16" stroke="#22c55e" strokeWidth="1.5" />
        </svg>
      </div>
      {children}
    </motion.div>
  )
}

const SEV = {
  normal:   { cls: 'bg-green-900/50 text-green-300 border-green-700/40',   Icon: CheckCircle,   label: 'Normal'   },
  warning:  { cls: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/40', Icon: AlertTriangle, label: 'Warning'  },
  critical: { cls: 'bg-red-900/50 text-red-300 border-red-700/40',          Icon: XCircle,       label: 'Critical' },
}

export function SeverityBadge({ severity = 'normal' }) {
  const { cls, Icon, label } = SEV[severity] || SEV.normal
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-mono', cls)}>
      <Icon size={11} />{label}
    </span>
  )
}

export function StatusDot({ severity = 'normal' }) {
  const c = { normal: 'bg-green-400', warning: 'bg-yellow-400', critical: 'bg-red-400' }[severity]
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-50', c)} />
      <span className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', c)} />
    </span>
  )
}

export function StatBlock({ label, value, unit = '', accentColor = '#22c55e', subtitle = '' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--muted)' }}>{label}</p>
      <div className="flex items-end gap-1.5">
        <motion.span key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="readout text-3xl font-bold leading-none" style={{ color: accentColor }}>
          {value}
        </motion.span>
        {unit && <span className="text-sm mb-0.5 font-mono" style={{ color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
    </div>
  )
}

export function ProgressBar({ value = 0, max = 100, color = '#22c55e', label = '', showValue = true }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between">
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
          {showValue && <span className="text-xs readout" style={{ color }}>{value.toFixed(1)}</span>}
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={clsx('animate-pulse rounded-lg', className)}
      style={{ background: 'rgba(255,255,255,0.05)' }} />
  )
}

export function ConfidenceGauge({ value = 0 }) {
  const pct   = value * 100
  const color = pct > 80 ? '#22c55e' : pct > 60 ? '#fbbf24' : '#f97316'
  const r = 28, cx = 36, cy = 36, sw = 5
  const circ  = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div>
        <p className="readout text-2xl font-bold" style={{ color }}>{pct.toFixed(0)}%</p>
        <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>CONFIDENCE</p>
      </div>
    </div>
  )
}

const CLASS_COLORS = {
  'Normal': '#22c55e', 'Water Stress': '#38bdf8',
  'Pest Infestation': '#f97316', 'Nutrient Deficiency': '#a78bfa',
  'Flood / Waterlogging': '#60a5fa',
}

export function ProbabilityBars({ probabilities = {} }) {
  return (
    <div className="space-y-2">
      {Object.entries(probabilities).map(([cls, prob]) => (
        <div key={cls} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="font-mono truncate" style={{ color: 'var(--muted)' }}>{cls}</span>
            <span className="readout" style={{ color: CLASS_COLORS[cls] || '#fff' }}>{(prob * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" style={{ background: CLASS_COLORS[cls] || '#22c55e' }}
              initial={{ width: 0 }} animate={{ width: `${prob * 100}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function InfoRow({ label, value, color = 'var(--text)' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--bord)' }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-sm font-medium readout" style={{ color }}>{value}</span>
    </div>
  )
}
