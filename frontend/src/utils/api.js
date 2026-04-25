import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api  = axios.create({ baseURL: `${BASE}/api/v1`, timeout: 30000 })

// Attach auth token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const { data } = await api.post('/login', { username, password })
  localStorage.setItem('token',     data.access_token)
  localStorage.setItem('username',  data.username)
  localStorage.setItem('farm_name', data.farm_name)
  return data
}

export async function register(username, password, farm_name) {
  const { data } = await api.post('/register', { username, password, farm_name })
  localStorage.setItem('token',     data.access_token)
  localStorage.setItem('username',  data.username)
  localStorage.setItem('farm_name', data.farm_name)
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('farm_name')
}

export function getStoredUser() {
  return {
    token:     localStorage.getItem('token'),
    username:  localStorage.getItem('username'),
    farm_name: localStorage.getItem('farm_name'),
  }
}

// ── Predictions ───────────────────────────────────────────────────────────────
export async function runPrediction(sensorData, imageFile = null, fieldId = 'field-01', cropType = 'wheat') {
  const form = new FormData()
  form.append('sensor_data', JSON.stringify(sensorData))
  form.append('field_id',    fieldId)
  form.append('crop_type',   cropType)
  if (imageFile) form.append('image', imageFile)
  const { data } = await api.post('/predict', form)
  return data
}

export async function getPredictions(fieldId = null, limit = 50) {
  const params = { limit }
  if (fieldId) params.field_id = fieldId
  const { data } = await api.get('/predictions', { params })
  return data
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlerts(params = {}) {
  const { data } = await api.get('/alerts', { params: { limit: 50, ...params } })
  return data
}

export async function resolveAlert(alertId) {
  const { data } = await api.put(`/alerts/${alertId}/resolve`)
  return data
}

// ── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalytics(fieldId = null, days = 30) {
  const params = { days }
  if (fieldId) params.field_id = fieldId
  const { data } = await api.get('/analytics', { params })
  return data
}

export async function exportCSV(fieldId = null) {
  const params = fieldId ? { field_id: fieldId } : {}
  const resp   = await api.get('/export-csv', { params, responseType: 'blob' })
  const url    = URL.createObjectURL(resp.data)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `field_report_${fieldId || 'all'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function getModelHealth() {
  const { data } = await api.get('/model-health')
  return data
}

// ── Weather ──────────────────────────────────────────────────────────────────
export async function getWeather(lat = 28.6139, lon = 77.209) {
  const { data } = await api.get('/weather', { params: { lat, lon } })
  return data
}

// ── Sensor upload ─────────────────────────────────────────────────────────────
export async function uploadSensorData(fieldId, sensorData) {
  const { data } = await api.post('/upload-sensor-data', { field_id: fieldId, sensor_data: sensorData })
  return data
}

// ── Mock sensor generator ─────────────────────────────────────────────────────
export function generateMockSensorData(n = 200, scenario = 'normal') {
  const t = Array.from({ length: n }, (_, i) => i * 0.05)
  let tempBase = 25, humBase = 62, soilBase = 45

  if (scenario === 'drought')  { tempBase = 36; humBase = 32; soilBase = 22 }
  if (scenario === 'flood')    { tempBase = 18; humBase = 92; soilBase = 90 }
  if (scenario === 'pest')     { tempBase = 26; humBase = 70; soilBase = 48 }

  return {
    temperature:   t.map(x => +(tempBase + 4*Math.sin(x)  + (Math.random()-.5)).toFixed(1)),
    humidity:      t.map(x => +(humBase  + 8*Math.cos(x)  + (Math.random()-.5)*2).toFixed(1)),
    co2:           t.map(x => +(410      + 40*Math.sin(.5*x) + (Math.random()-.5)*5).toFixed(0)),
    soil_moisture: t.map(x => +(soilBase + 6*Math.sin(.3*x) + (Math.random()-.5)).toFixed(1)),
    ndvi:          t.map(x => +(Math.max(-1, Math.min(1, 0.55 + 0.2*Math.sin(.2*x) + (Math.random()-.5)*.05))).toFixed(3)),
  }
}
