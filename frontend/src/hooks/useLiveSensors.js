/**
 * useLiveSensors - connects to WebSocket for real-time sensor updates.
 * Falls back to simulated data if WebSocket is unavailable.
 */
import { useState, useEffect, useRef } from 'react'

const BASE_WS = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000'

export default function useLiveSensors() {
  const [data, setData] = useState({
    temperature: 24.3, humidity: 61.2,
    co2: 418.0, soil_moisture: 42.1,
    timestamp: new Date().toISOString(),
    connected: false,
  })
  const wsRef     = useRef(null)
  const timerRef  = useRef(null)

  // Simulation fallback
  const simulate = () => {
    setData(prev => ({
      temperature:   +(prev.temperature   + (Math.random()-.5)*.4).toFixed(1),
      humidity:      +(prev.humidity      + (Math.random()-.5)*.6).toFixed(1),
      co2:           +(prev.co2           + (Math.random()-.5)*3 ).toFixed(0),
      soil_moisture: +(prev.soil_moisture + (Math.random()-.5)*.3).toFixed(1),
      timestamp:     new Date().toISOString(),
      connected:     false,
    }))
  }

  useEffect(() => {
    // Try WebSocket first
    try {
      wsRef.current = new WebSocket(`${BASE_WS}/ws/live`)

      wsRef.current.onmessage = (e) => {
        const d = JSON.parse(e.data)
        setData({ ...d, connected: true })
      }

      wsRef.current.onerror = () => {
        // Fall back to simulation
        timerRef.current = setInterval(simulate, 2500)
      }

      wsRef.current.onclose = () => {
        if (!timerRef.current) {
          timerRef.current = setInterval(simulate, 2500)
        }
      }
    } catch {
      timerRef.current = setInterval(simulate, 2500)
    }

    return () => {
      wsRef.current?.close()
      clearInterval(timerRef.current)
    }
  }, [])

  return data
}
