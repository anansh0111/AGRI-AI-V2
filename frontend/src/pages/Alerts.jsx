import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, RefreshCw, XCircle, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, SeverityBadge, Skeleton } from '../components/ui/index'
import { getAlerts, resolveAlert } from '../utils/api'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const DEMO = [
  {id:'1',field_id:'field-01',timestamp:new Date(Date.now()-3600000).toISOString(),   anomaly_class:'Water Stress',        severity:'warning', confidence:0.84,carbon_emission:1560,resolved:false,irrigation:{recommendation:'Irrigate now',litres_per_hectare:39000,urgency:'high'}},
  {id:'2',field_id:'field-02',timestamp:new Date(Date.now()-7200000).toISOString(),   anomaly_class:'Pest Infestation',     severity:'critical',confidence:0.91,carbon_emission:3120,resolved:false,irrigation:null},
  {id:'3',field_id:'field-01',timestamp:new Date(Date.now()-86400000).toISOString(),  anomaly_class:'Nutrient Deficiency',  severity:'warning', confidence:0.76,carbon_emission:1890,resolved:true, irrigation:null},
  {id:'4',field_id:'field-03',timestamp:new Date(Date.now()-172800000).toISOString(), anomaly_class:'Flood / Waterlogging', severity:'critical',confidence:0.88,carbon_emission:4200,resolved:false,irrigation:null},
]

function AlertRow({ alert, onResolve }) {
  const ago = (() => { try { return formatDistanceToNow(new Date(alert.timestamp),{addSuffix:true}) } catch { return '' } })()
  const bc = alert.resolved?'rgba(34,197,94,0.2)':alert.severity==='critical'?'rgba(239,68,68,0.3)':'rgba(251,191,36,0.3)'
  const bg = alert.resolved?'transparent':alert.severity==='critical'?'rgba(239,68,68,0.04)':'rgba(251,191,36,0.04)'

  return (
    <motion.div layout initial={{opacity:0,x:-12}} animate={{opacity:alert.resolved?.4:1,x:0}} exit={{opacity:0}}
      className="p-4 rounded-xl border transition-all" style={{borderColor:bc,background:bg}}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alert.resolved ? <CheckCircle size={18} className="text-green-500"/>
            : alert.severity==='critical' ? <XCircle size={18} className="text-red-400"/>
            : <AlertTriangle size={18} className="text-yellow-400"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-medium text-sm text-white">{alert.anomaly_class}</p>
            <SeverityBadge severity={alert.resolved?'normal':alert.severity}/>
          </div>
          <div className="flex gap-3 text-xs font-mono flex-wrap" style={{color:'var(--muted)'}}>
            <span>{alert.field_id}</span>
            <span>{ago}</span>
            <span>{alert.carbon_emission?.toFixed(0)} kg/ha</span>
            <span>{(alert.confidence*100).toFixed(0)}% confidence</span>
          </div>
          {alert.irrigation && !alert.resolved && (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono" style={{color:'#38bdf8'}}>
              <Droplets size={11}/>
              {alert.irrigation.recommendation} · {(alert.irrigation.litres_per_hectare||0).toLocaleString()} L/ha needed
            </div>
          )}
        </div>
        {!alert.resolved && (
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>onResolve(alert.id)}
            className="flex-shrink-0 text-xs px-3 py-1.5 glass text-green-400 hover:text-white transition-colors rounded-lg font-mono">
            Resolve
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState([])
  const [loading,setLoading]  = useState(true)
  const [filter, setFilter]   = useState('all')

  const load = async () => {
    setLoading(true)
    try { const {alerts:d} = await getAlerts({limit:50}); setAlerts(d.length>0?d:DEMO) }
    catch { setAlerts(DEMO) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const handleResolve = async id => {
    try { await resolveAlert(id) } catch {}
    setAlerts(prev=>prev.map(a=>a.id===id?{...a,resolved:true}:a))
    toast.success('Alert resolved')
  }

  const filtered = alerts.filter(a=>{
    if(filter==='active')   return !a.resolved
    if(filter==='critical') return a.severity==='critical'&&!a.resolved
    if(filter==='resolved') return a.resolved
    return true
  })

  const active   = alerts.filter(a=>!a.resolved).length
  const critical = alerts.filter(a=>!a.resolved&&a.severity==='critical').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl text-white">Alerts</h1>
          <p className="text-sm mt-0.5 font-mono" style={{color:'var(--muted)'}}>{active} active · {critical} critical</p>
        </div>
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={load}
          className="flex items-center gap-2 px-4 py-2 glass text-sm text-green-400 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
        </motion.button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Active',value:active,color:'#fbbf24'},{label:'Critical',value:critical,color:'#ef4444'},{label:'Total',value:alerts.length,color:'#22c55e'}]
          .map(({label,value,color},i)=>(
          <Card key={label} delay={i*.06}>
            <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>{label}</p>
            <p className="readout text-3xl font-bold mt-1" style={{color}}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {['all','active','critical','resolved'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className="text-xs px-3 py-1.5 rounded-lg font-mono capitalize transition-all"
            style={{background:filter===f?'rgba(34,197,94,0.1)':'transparent',
              border:filter===f?'1px solid rgba(34,197,94,0.3)':'1px solid transparent',
              color:filter===f?'#4ade80':'var(--muted)'}}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({length:4},(_,i)=><Skeleton key={i} className="h-24 w-full"/>)
          : filtered.length===0
          ? (<div className="text-center py-16"><CheckCircle size={30} className="mx-auto mb-3 text-green-600"/>
              <p className="font-medium text-white">All clear</p>
              <p className="text-sm mt-1" style={{color:'var(--muted)'}}>No alerts in this category</p></div>)
          : <AnimatePresence>{filtered.map((a,i)=><AlertRow key={a.id||i} alert={a} onResolve={handleResolve}/>)}</AnimatePresence>
        }
      </div>
    </div>
  )
}
