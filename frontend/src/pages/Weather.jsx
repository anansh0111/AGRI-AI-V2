import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CloudSun, Droplets, Wind, Thermometer, RefreshCw } from 'lucide-react'
import { Card, StatBlock, Skeleton } from '../components/ui/index'
import { getWeather } from '../utils/api'

export default function Weather() {
  const [data,   setData]   = useState(null)
  const [loading,setLoading]= useState(true)

  const load = async () => {
    setLoading(true)
    try { setData(await getWeather()) }
    catch { setData({temperature:24.5,humidity:62,pressure:1012,wind_speed:11,wind_direction:180,description:'partly cloudy',city:'Demo City',source:'simulated'}) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const windDir = (d) => {
    const dirs = ['N','NE','E','SE','S','SW','W','NW']
    return dirs[Math.round(d/45)%8]
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl text-white">Weather</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--muted)'}}>
            {data?.city} · {data?.source === 'simulated' ? 'Demo data (add API key in .env)' : 'Live from OpenWeatherMap'}
          </p>
        </div>
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={load}
          className="flex items-center gap-2 px-4 py-2 glass text-sm text-green-400 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
        </motion.button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length:4},(_,i)=><Skeleton key={i} className="h-32 w-full"/>)}
        </div>
      ) : (
        <>
          {/* Main weather card */}
          <Card glow>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl" style={{background:'rgba(251,191,36,0.1)'}}>
                <CloudSun size={36} style={{color:'#fbbf24'}}/>
              </div>
              <div>
                <p className="readout text-5xl font-bold text-white">{data?.temperature}°</p>
                <p className="text-sm capitalize mt-1" style={{color:'var(--muted)'}}>{data?.description}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="display text-lg text-white">{data?.city}</p>
                <p className="text-xs font-mono mt-1" style={{color:'var(--muted)'}}>
                  {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {icon:Thermometer,label:'Temperature',value:data?.temperature,unit:'°C',color:'#f97316'},
              {icon:Droplets,   label:'Humidity',   value:data?.humidity,   unit:'%', color:'#38bdf8'},
              {icon:Wind,       label:'Wind Speed',  value:data?.wind_speed, unit:'km/h',color:'#22c55e'},
              {icon:CloudSun,   label:'Pressure',    value:data?.pressure,   unit:'hPa',color:'#a78bfa'},
            ].map(({icon:Icon,label,value,unit,color},i)=>(
              <Card key={label} delay={i*.06}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{background:`${color}18`}}>
                    <Icon size={16} style={{color}}/>
                  </div>
                  <StatBlock label={label} value={value?.toString()??'—'} unit={unit} accentColor={color}/>
                </div>
              </Card>
            ))}
          </div>

          {/* Agricultural impact */}
          <Card>
            <p className="text-xs uppercase tracking-widest font-mono mb-4" style={{color:'var(--muted)'}}>
              Agricultural Impact Assessment
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.15)'}}>
                <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{color:'var(--muted)'}}>Irrigation Need</p>
                <p className="text-sm font-medium" style={{color: data?.humidity<50?'#fbbf24':'#4ade80'}}>
                  {data?.humidity<50 ? 'Recommended' : 'Not urgent'}
                </p>
                <p className="text-xs mt-1" style={{color:'var(--muted)'}}>Based on {data?.humidity}% humidity</p>
              </div>
              <div className="p-4 rounded-lg" style={{background:'rgba(56,189,248,0.06)',border:'1px solid rgba(56,189,248,0.15)'}}>
                <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{color:'var(--muted)'}}>Crop Stress Risk</p>
                <p className="text-sm font-medium" style={{color: data?.temperature>32?'#ef4444':data?.temperature>28?'#fbbf24':'#4ade80'}}>
                  {data?.temperature>32?'High':data?.temperature>28?'Moderate':'Low'}
                </p>
                <p className="text-xs mt-1" style={{color:'var(--muted)'}}>Temp: {data?.temperature}°C</p>
              </div>
              <div className="p-4 rounded-lg" style={{background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)'}}>
                <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{color:'var(--muted)'}}>Wind Risk</p>
                <p className="text-sm font-medium" style={{color: data?.wind_speed>40?'#ef4444':data?.wind_speed>20?'#fbbf24':'#4ade80'}}>
                  {data?.wind_speed>40?'High':data?.wind_speed>20?'Moderate':'Low'} · {windDir(data?.wind_direction??0)}
                </p>
                <p className="text-xs mt-1" style={{color:'var(--muted)'}}>{data?.wind_speed} km/h</p>
              </div>
            </div>
          </Card>

          {data?.source === 'simulated' && (
            <div className="p-4 rounded-xl text-xs font-mono" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24'}}>
              Using simulated weather data. To get real weather: sign up free at openweathermap.org → copy your API key → add to backend/.env as OPENWEATHER_API_KEY=your_key_here
            </div>
          )}
        </>
      )}
    </div>
  )
}
