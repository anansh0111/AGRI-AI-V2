import { useState, useEffect } from 'react'
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
         RadarChart,PolarGrid,PolarAngleAxis,PolarRadiusAxis,Radar,Legend } from 'recharts'
import { Download, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, StatBlock, Skeleton } from '../components/ui/index'
import EmissionTrendChart from '../components/charts/EmissionTrendChart'
import AnomalyDonutChart  from '../components/charts/AnomalyDonutChart'
import { getAnalytics, exportCSV, getModelHealth } from '../utils/api'
import toast from 'react-hot-toast'

const Tip = ({active,payload,label})=>{
  if(!active||!payload?.length) return null
  return (<div className="glass px-3 py-2 text-xs"><p className="font-mono mb-1" style={{color:'var(--muted)'}}>{label}</p>
    {payload.map(p=><p key={p.name} style={{color:p.color}} className="readout">{p.name}: {p.value}</p>)}</div>)
}

const DEMO = {
  summary:{avg_carbon_kg_ha:1247,max_carbon_kg_ha:4100,min_carbon_kg_ha:420,alert_count:11,total_predictions:180,alert_rate:0.061,avg_confidence:0.81,model_status:'healthy'},
  emission_trend:Array.from({length:30},(_,i)=>({date:new Date(Date.now()-(29-i)*86400000).toISOString().slice(0,10),avg_carbon:600+500*Math.sin(i*.25)+Math.random()*300})),
  anomaly_distribution:{'Normal':155,'Water Stress':12,'Pest Infestation':5,'Nutrient Deficiency':5,'Flood / Waterlogging':3},
}

const WEEKLY=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>({day,carbon:Math.floor(900+Math.random()*800),alerts:Math.floor(Math.random()*3)}))
const RADAR=[{axis:'Temperature',value:85},{axis:'Humidity',value:72},{axis:'CO₂',value:61},{axis:'NDVI',value:90},{axis:'Soil',value:78},{axis:'Wind',value:55}]

export default function Analytics() {
  const [data,   setData]   = useState(null)
  const [health, setHealth] = useState(null)
  const [loading,setLoading]= useState(true)
  const [range,  setRange]  = useState(30)

  useEffect(()=>{
    setLoading(true)
    Promise.all([getAnalytics(null,range), getModelHealth()])
      .then(([ana,h])=>{ setData(ana.summary.total_predictions>0?ana:DEMO); setHealth(h) })
      .catch(()=>{ setData(DEMO); setHealth(null) })
      .finally(()=>setLoading(false))
  },[range])

  const handleExport = async () => {
    try { await exportCSV(); toast.success('CSV downloaded!') }
    catch { toast.error('Export failed — is the backend running?') }
  }

  const s = data?.summary ?? DEMO.summary

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-2xl text-white">Analytics</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--muted)'}}>Historical performance and AI model health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[7,14,30,90].map(d=>(
              <button key={d} onClick={()=>setRange(d)}
                className="text-xs px-3 py-1.5 rounded-lg font-mono transition-all"
                style={{background:range===d?'rgba(34,197,94,0.1)':'transparent',
                  border:range===d?'1px solid rgba(34,197,94,0.3)':'1px solid var(--bord)',
                  color:range===d?'#4ade80':'var(--muted)'}}>
                {d}d
              </button>
            ))}
          </div>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 glass text-sm text-green-400 hover:text-white transition-colors">
            <Download size={14}/> Export CSV
          </motion.button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Avg Emission', value:s.avg_carbon_kg_ha?.toFixed(0)?? '—',unit:'kg/ha',color:'#22c55e'},
          {label:'Peak Emission',value:s.max_carbon_kg_ha?.toFixed(0)?? '—',unit:'kg/ha',color:'#ef4444'},
          {label:'Alert Rate',   value:((s.alert_rate??0)*100).toFixed(1),  unit:'%',    color:'#fbbf24'},
          {label:'Total Scans',  value:s.total_predictions??'—',             unit:'',     color:'#38bdf8'},
        ].map(({label,value,unit,color},i)=>(
          <Card key={label} delay={i*.06}>
            <StatBlock label={label} value={value} unit={unit} accentColor={color}/>
          </Card>
        ))}
      </div>

      {/* Model health card */}
      {(health || s.model_status) && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-green-400"/>
            <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>AI Model Health</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-mono" style={{color:'var(--muted)'}}>Avg Confidence</p>
              <p className="readout text-2xl font-bold" style={{color: s.avg_confidence>0.75?'#4ade80':'#fbbf24'}}>
                {((s.avg_confidence??0)*100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-mono" style={{color:'var(--muted)'}}>Model Status</p>
              <p className="text-sm font-medium mt-1" style={{color:s.model_status==='healthy'?'#4ade80':'#fbbf24'}}>
                {s.model_status?.toUpperCase()?? 'UNKNOWN'}
              </p>
            </div>
            {health && <>
              <div>
                <p className="text-xs font-mono" style={{color:'var(--muted)'}}>Low Confidence</p>
                <p className="readout text-2xl font-bold" style={{color:health.low_conf_pct>20?'#ef4444':'#4ade80'}}>
                  {health.low_conf_pct}%
                </p>
              </div>
              <div>
                <p className="text-xs font-mono mb-1" style={{color:'var(--muted)'}}>Recommendation</p>
                <p className="text-xs" style={{color:'var(--muted)'}}>{health.recommendation}</p>
              </div>
            </>}
          </div>
        </Card>
      )}

      {/* Trend chart */}
      <Card>
        <p className="text-xs uppercase tracking-widest font-mono mb-4" style={{color:'var(--muted)'}}>
          Emission Trend — {range} Days
        </p>
        {loading
          ? <Skeleton className="h-52 w-full"/>
          : <EmissionTrendChart data={data?.emission_trend??[]} height={220}/>
        }
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <p className="text-xs uppercase tracking-widest font-mono mb-4" style={{color:'var(--muted)'}}>
            Weekly Carbon vs Alerts
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY} barGap={4}>
              <CartesianGrid stroke="rgba(34,197,94,0.07)" vertical={false} strokeDasharray="4 4"/>
              <XAxis dataKey="day" tick={{fill:'#6b8c72',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="l" tick={{fill:'#6b8c72',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="r" orientation="right" tick={{fill:'#6b8c72',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar yAxisId="l" dataKey="carbon" name="Carbon (kg/ha)" fill="#22c55e" opacity={0.8} radius={[3,3,0,0]}/>
              <Bar yAxisId="r" dataKey="alerts"  name="Alerts"        fill="#f97316" opacity={0.7} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest font-mono mb-2" style={{color:'var(--muted)'}}>
            Anomaly Distribution
          </p>
          <AnomalyDonutChart distribution={data?.anomaly_distribution??{}} height={220}/>
        </Card>
      </div>

      {/* Radar chart */}
      <Card>
        <p className="text-xs uppercase tracking-widest font-mono mb-4" style={{color:'var(--muted)'}}>
          Sensor Health Score (%)
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={RADAR}>
            <PolarGrid stroke="rgba(34,197,94,0.15)"/>
            <PolarAngleAxis dataKey="axis" tick={{fill:'#6b8c72',fontSize:10,fontFamily:'Space Mono'}}/>
            <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:'#6b8c72',fontSize:9}}/>
            <Radar name="Health" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18}/>
            <Legend formatter={v=><span style={{color:'#6b8c72',fontSize:10}}>{v}</span>}/>
          </RadarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
