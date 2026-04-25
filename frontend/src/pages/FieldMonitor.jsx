import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Play, CheckCircle, Image as ImageIcon, Database, Zap, Droplets, Leaf, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, SeverityBadge, ConfidenceGauge, ProbabilityBars, StatBlock, Skeleton, InfoRow } from '../components/ui/index'
import { runPrediction, generateMockSensorData } from '../utils/api'
import clsx from 'clsx'

const SCENARIOS = [
  {label:'Normal',  value:'normal',  color:'#22c55e'},
  {label:'Drought', value:'drought', color:'#f97316'},
  {label:'Flood',   value:'flood',   color:'#60a5fa'},
  {label:'Pest',    value:'pest',    color:'#a78bfa'},
]

const CROPS = ['wheat','rice','corn','cotton','sugarcane']

function DropZone({ onFile, file }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(([f]) => f && onFile(f), [onFile]),
    accept: { 'image/*': ['.jpg','.jpeg','.png'] }, maxFiles: 1,
  })
  return (
    <div {...getRootProps()} className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-36 p-6 rounded-xl border-2 border-dashed"
      style={{ borderColor: isDragActive?'#22c55e':file?'#16a34a':'rgba(255,255,255,0.1)', background: isDragActive?'rgba(34,197,94,0.05)':'transparent' }}>
      <input {...getInputProps()} />
      {file ? (
        <><CheckCircle size={26} className="text-green-400"/><p className="text-sm text-green-300 font-mono truncate max-w-xs">{file.name}</p></>
      ) : (
        <><ImageIcon size={26} style={{color:'var(--muted)'}}/><p className="text-sm text-center" style={{color:'var(--muted)'}}>{isDragActive?'Drop here...':'Drag & drop drone image or click'}</p><p className="text-xs" style={{color:'rgba(107,140,114,0.5)'}}>JPEG / PNG · max 20 MB</p></>
      )}
    </div>
  )
}

function IrrigationCard({ irrigation }) {
  if (!irrigation) return null
  const urgencyColor = {high:'#ef4444',medium:'#fbbf24',low:'#22c55e'}[irrigation.urgency]
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Droplets size={15} className="text-sky-400"/>
        <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Irrigation Recommendation</p>
      </div>
      <div className="space-y-1">
        <InfoRow label="Recommendation" value={irrigation.recommendation} color={urgencyColor}/>
        <InfoRow label="Deficit" value={`${irrigation.deficit_pct}%`}/>
        <InfoRow label="Water Needed" value={`${irrigation.litres_per_sqm} L/m²`} color="#38bdf8"/>
        <InfoRow label="Per Hectare" value={`${(irrigation.litres_per_hectare||0).toLocaleString()} L/ha`}/>
      </div>
    </Card>
  )
}

function NDVICard({ ndvi }) {
  if (!ndvi) return null
  const statusColor = {excellent:'#22c55e',good:'#4ade80',stressed:'#fbbf24',poor:'#f97316',bare:'#ef4444'}[ndvi.status]
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Leaf size={15} className="text-green-400"/>
        <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>NDVI Crop Health</p>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className="readout text-3xl font-bold" style={{color:statusColor}}>{ndvi.ndvi_value}</p>
          <p className="text-xs font-mono mt-0.5" style={{color:'var(--muted)'}}>NDVI Index</p>
        </div>
        <div>
          <p className="text-sm font-medium" style={{color:statusColor}}>{ndvi.status.toUpperCase()}</p>
          <p className="text-xs" style={{color:'var(--muted)'}}>{ndvi.description}</p>
        </div>
      </div>
      <InfoRow label="Healthy vegetation" value={`${ndvi.healthy_pct}%`} color="#22c55e"/>
    </Card>
  )
}

function YieldCard({ yieldPred }) {
  if (!yieldPred) return null
  const isAbove = yieldPred.compared_to_average === 'above'
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-amber-400"/>
        <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Yield Prediction</p>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <p className="readout text-3xl font-bold" style={{color: isAbove?'#22c55e':'#f97316'}}>
          {yieldPred.predicted_yield_tonnes_ha}
        </p>
        <p className="text-sm mb-0.5 font-mono" style={{color:'var(--muted)'}}>t/ha</p>
      </div>
      <p className="text-xs" style={{color: isAbove?'#4ade80':'#f97316'}}>
        {isAbove?'Above':'Below'} average yield
      </p>
      <p className="text-xs mt-1" style={{color:'var(--muted)'}}>{yieldPred.note}</p>
    </Card>
  )
}

export default function FieldMonitor() {
  const [sensorData, setSensorData] = useState(null)
  const [imageFile,  setImageFile]  = useState(null)
  const [fieldId,    setFieldId]    = useState('field-01')
  const [cropType,   setCropType]   = useState('wheat')
  const [scenario,   setScenario]   = useState('normal')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState(null)

  const handleRun = async () => {
    if (!sensorData) { toast.error('Generate or upload sensor data first'); return }
    setLoading(true); setResult(null)
    try {
      const res = await runPrediction(sensorData, imageFile, fieldId, cropType)
      setResult(res)
      if (res.is_alert) toast.error(`⚠️ ${res.anomaly_class} — ${res.alert_severity}`)
      else toast.success('Field status: Normal ✓')
    } catch {
      toast.error('Backend not running — showing demo result')
      setResult({
        carbon_emission_kg_ha:1243.5,anomaly_class:'Water Stress',anomaly_class_id:1,
        confidence_score:0.82,is_alert:true,alert_severity:'warning',
        anomaly_probabilities:{'Normal':0.12,'Water Stress':0.82,'Pest Infestation':0.03,'Nutrient Deficiency':0.02,'Flood / Waterlogging':0.01},
        irrigation:{current_moisture:28,target_moisture:65,deficit_pct:37,litres_per_sqm:3.9,litres_per_hectare:39000,recommendation:'Irrigate now',urgency:'high'},
        ndvi_analysis:{ndvi_value:0.28,status:'stressed',description:'Sparse or stressed vegetation',healthy_pct:40.0},
        yield_prediction:{predicted_yield_tonnes_ha:2.8,compared_to_average:'below',note:'Yield affected by water stress'},
        gradcam_base64:null,
      })
    } finally { setLoading(false) }
  }

  const sensorColor = result?.alert_severity==='critical'?'#ef4444':result?.alert_severity==='warning'?'#fbbf24':'#22c55e'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl text-white">Field Monitor</h1>
        <p className="text-sm mt-0.5" style={{color:'var(--muted)'}}>Upload sensor data and drone imagery to run AI analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Inputs */}
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-widest font-mono block mb-1.5" style={{color:'var(--muted)'}}>Field ID</label>
                <input value={fieldId} onChange={e=>setFieldId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid var(--bord)'}}/>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest font-mono block mb-1.5" style={{color:'var(--muted)'}}>Crop Type</label>
                <select value={cropType} onChange={e=>setCropType(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none capitalize"
                  style={{background:'rgba(17,26,20,0.95)',border:'1px solid var(--bord)'}}>
                  {CROPS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-green-400"/>
                <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Sensor Data</p>
              </div>
              <div className="flex gap-2">
                {SCENARIOS.map(s=>(
                  <button key={s.value} onClick={()=>setScenario(s.value)}
                    className="text-xs px-2.5 py-1 rounded-lg font-mono transition-all"
                    style={{
                      background: scenario===s.value?`${s.color}18`:'transparent',
                      border: `1px solid ${scenario===s.value?s.color:'rgba(255,255,255,0.1)'}`,
                      color: scenario===s.value?s.color:'var(--muted)',
                    }}>{s.label}
                  </button>
                ))}
              </div>
            </div>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              onClick={()=>{setSensorData(generateMockSensorData(200,scenario));toast.success(`${scenario} scenario loaded`)}}
              className="w-full py-2.5 rounded-lg text-sm font-mono flex items-center justify-center gap-2 mb-3 transition-colors text-green-300"
              style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)'}}>
              <Zap size={13}/> Generate {scenario} Sensor Data
            </motion.button>

            {sensorData ? (
              <div className="rounded-lg p-3 font-mono text-xs overflow-auto max-h-36"
                style={{background:'rgba(0,0,0,0.3)',border:'1px solid var(--bord)',color:'#4ade80'}}>
                {Object.entries(sensorData).map(([k,v])=>(
                  <div key={k}>{k}: [{v[0].toFixed(2)} … {v[v.length-1].toFixed(2)}]</div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm py-4" style={{color:'var(--muted)'}}>
                Select a scenario and click Generate
              </p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={14} className="text-sky-400"/>
              <p className="text-xs uppercase tracking-widest font-mono" style={{color:'var(--muted)'}}>Drone Image (Optional)</p>
            </div>
            <DropZone onFile={setImageFile} file={imageFile}/>
          </Card>

          <motion.button whileHover={{scale:loading||!sensorData?1:1.02}} whileTap={{scale:loading||!sensorData?1:0.98}}
            onClick={handleRun} disabled={loading||!sensorData}
            className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
            style={{fontFamily:'Syne,sans-serif',background:loading||!sensorData?'rgba(255,255,255,0.05)':'#16a34a',
              color:loading||!sensorData?'var(--muted)':'white',cursor:loading||!sensorData?'not-allowed':'pointer'}}>
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Running AI Analysis...</>
              : <><Play size={16} fill="currentColor"/>Run AI Prediction</>
            }
          </motion.button>
        </div>

        {/* Right: Results */}
        <div>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="load" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                <Skeleton className="h-32 w-full"/><Skeleton className="h-48 w-full"/><Skeleton className="h-24 w-full"/>
              </motion.div>
            ) : result ? (
              <motion.div key="result" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card glow>
                    <StatBlock label="Carbon Emission" value={result.carbon_emission_kg_ha?.toFixed(1)??'—'} unit="kg/ha" accentColor={sensorColor}/>
                    <div className="mt-3"><SeverityBadge severity={result.alert_severity}/></div>
                  </Card>
                  <Card>
                    <ConfidenceGauge value={result.confidence_score??0}/>
                    <p className="text-sm font-medium text-white mt-2">{result.anomaly_class}</p>
                  </Card>
                </div>
                <Card>
                  <p className="text-xs uppercase tracking-widest font-mono mb-3" style={{color:'var(--muted)'}}>Class Probabilities</p>
                  <ProbabilityBars probabilities={result.anomaly_probabilities??{}}/>
                </Card>
                <NDVICard ndvi={result.ndvi_analysis}/>
                <IrrigationCard irrigation={result.irrigation}/>
                <YieldCard yieldPred={result.yield_prediction}/>
                {result.gradcam_base64 && (
                  <Card>
                    <p className="text-xs uppercase tracking-widest font-mono mb-3" style={{color:'var(--muted)'}}>Grad-CAM Heatmap</p>
                    <img src={`data:image/png;base64,${result.gradcam_base64}`} alt="Grad-CAM" className="w-full rounded-lg"/>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}}
                className="flex flex-col items-center justify-center min-h-96 text-center space-y-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--bord)'}}>
                  <Play size={18} className="text-green-400 ml-1"/>
                </div>
                <p className="text-sm" style={{color:'var(--muted)'}}>Run a prediction to see results</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
