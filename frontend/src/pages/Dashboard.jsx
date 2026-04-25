import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Thermometer, Droplets, Activity, Wind, Wifi, WifiOff } from 'lucide-react'
import CarbonGlobe from '../components/3d/CarbonGlobe'
import FieldTerrain3D from '../components/3d/FieldTerrain3D'
import EmissionTrendChart from '../components/charts/EmissionTrendChart'
import AnomalyDonutChart  from '../components/charts/AnomalyDonutChart'
import { Card, StatBlock, SeverityBadge, StatusDot, Skeleton } from '../components/ui/index'
import { getAnalytics } from '../utils/api'
import useLiveSensors from '../hooks/useLiveSensors'

const DEMO = {
  summary: { avg_carbon_kg_ha:1247, alert_count:3, total_predictions:48, alert_rate:0.063, avg_confidence:0.81, model_status:'healthy' },
  emission_trend: Array.from({length:14},(_,i)=>({
    date: new Date(Date.now()-(13-i)*86400000).toISOString().slice(0,10),
    avg_carbon: 700+Math.random()*1200,
  })),
  anomaly_distribution: {'Normal':38,'Water Stress':5,'Pest Infestation':2,'Nutrient Deficiency':2,'Flood / Waterlogging':1},
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const sensors = useLiveSensors()

  const load = async () => {
    setLoading(true)
    try { setData(await getAnalytics()) }
    catch { setData(DEMO) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const carbon   = data?.summary?.avg_carbon_kg_ha ?? 0
  const severity = carbon > 3000 ? 'critical' : carbon > 1500 ? 'warning' : 'normal'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl text-white">Field Overview</h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color:'var(--muted)' }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: sensors.connected ? '#4ade80' : 'var(--muted)' }}>
            {sensors.connected ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {sensors.connected ? 'Live' : 'Simulated'}
          </div>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={load}
            className="flex items-center gap-2 px-4 py-2 glass text-sm text-green-400 hover:text-white transition-colors">
            <RefreshCw size={14} className={loading?'animate-spin':''} /> Refresh
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        <Card glow className="flex flex-col items-center gap-4 min-w-[260px]">
          <p className="text-xs uppercase tracking-widest font-mono self-start" style={{color:'var(--muted)'}}>
            Carbon Emission
          </p>
          <CarbonGlobe value={carbon} size={200} />
          <div className="text-center space-y-1">
            {loading
              ? <div className="h-10 w-32 mx-auto animate-pulse rounded-lg" style={{background:'rgba(255,255,255,0.05)'}}/>
              : <p className="readout text-4xl font-bold text-white">{carbon.toFixed(0)}</p>
            }
            <p className="text-xs font-mono" style={{color:'var(--muted)'}}>kg CO₂e / ha</p>
            <SeverityBadge severity={severity} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {[
            {icon:Thermometer, label:'Temperature',  val:sensors.temperature,  unit:'°C',  color:'#f97316'},
            {icon:Droplets,    label:'Humidity',     val:sensors.humidity,     unit:'%',   color:'#38bdf8'},
            {icon:Activity,    label:'CO₂',          val:sensors.co2,          unit:'ppm', color:'#a78bfa'},
            {icon:Wind,        label:'Soil Moisture', val:sensors.soil_moisture, unit:'%', color:'#22c55e'},
          ].map(({icon:Icon,label,val,unit,color},i)=>(
            <Card key={label} delay={i*0.06}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{background:`${color}18`}}>
                  <Icon size={16} style={{color}} />
                </div>
                <StatBlock label={label} value={val?.toString()} unit={unit} accentColor={color} />
              </div>
            </Card>
          ))}

          <Card delay={0.26} className="col-span-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <StatusDot severity={data?.summary?.alert_count>0?'warning':'normal'} />
                <div>
                  <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Active Alerts</p>
                  <p className="readout text-2xl font-bold text-white">{loading?'—':data?.summary?.alert_count??0}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Total Scans</p>
                <p className="readout text-2xl font-bold text-white">{loading?'—':data?.summary?.total_predictions??0}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Model Status</p>
                <p className="readout text-sm font-bold"
                  style={{color: data?.summary?.model_status==='healthy'?'#4ade80':'#fbbf24'}}>
                  {data?.summary?.model_status??'—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Avg Confidence</p>
                <p className="readout text-2xl font-bold" style={{color:'#38bdf8'}}>
                  {loading?'—':`${((data?.summary?.avg_confidence??0)*100).toFixed(0)}%`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <Card>
          <p className="text-xs uppercase tracking-widest font-mono mb-4" style={{color:'var(--muted)'}}>
            14-Day Emission Trend
          </p>
          {loading
            ? <Skeleton className="h-52 w-full" />
            : <EmissionTrendChart data={data?.emission_trend??[]} />
          }
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest font-mono mb-2" style={{color:'var(--muted)'}}>
            Anomaly Distribution
          </p>
          {loading
            ? <Skeleton className="h-52 w-full" />
            : <AnomalyDonutChart distribution={data?.anomaly_distribution??{}} />
          }
        </Card>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-widest font-mono mb-3" style={{color:'var(--muted)'}}>
          Live Field Map — 3D View
        </p>
        <FieldTerrain3D
          zones={[
            {cx:0.25,cy:0.72,radius:0.12,severity:'warning'},
            {cx:0.70,cy:0.30,radius:0.08,severity:'critical'},
          ]}
          height={280}
        />
        <div className="flex gap-5 mt-3 text-xs font-mono" style={{color:'var(--muted)'}}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Healthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Stress</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Critical</span>
        </div>
      </Card>
    </div>
  )
}
