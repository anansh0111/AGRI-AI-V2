import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Sidebar      from './components/ui/Sidebar'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import FieldMonitor from './pages/FieldMonitor'
import AlertsPage   from './pages/Alerts'
import Analytics    from './pages/Analytics'
import Weather      from './pages/Weather'
import { getStoredUser } from './utils/api'

function PrivateRoute({ children }) {
  const { token } = getStoredUser()
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AppLayout({ children }) {
  return (
    <>
      <div className="scanline" />
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(34,197,94,0.07) 0%, transparent 70%)' }} />

      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen" style={{ marginLeft: 64 }}>
          <div className="max-w-5xl mx-auto px-5 py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>
        } />
        <Route path="/monitor" element={
          <PrivateRoute><AppLayout><FieldMonitor /></AppLayout></PrivateRoute>
        } />
        <Route path="/alerts" element={
          <PrivateRoute><AppLayout><AlertsPage /></AppLayout></PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute><AppLayout><Analytics /></AppLayout></PrivateRoute>
        } />
        <Route path="/weather" element={
          <PrivateRoute><AppLayout><Weather /></AppLayout></PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <AppLayout>
              <motion.div initial={{opacity:0}} animate={{opacity:1}}
                className="flex flex-col items-center justify-center min-h-96 text-center">
                <p className="display text-2xl text-white mb-2">Settings</p>
                <p className="text-sm" style={{color:'var(--muted)'}}>Configure API keys, notifications and preferences</p>
                <div className="mt-6 p-5 glass max-w-md w-full text-left">
                  <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{color:'var(--muted)'}}>Environment Variables</p>
                  {[
                    {key:'OPENWEATHER_API_KEY', hint:'Get free key at openweathermap.org'},
                    {key:'ALERT_EMAIL',          hint:'Email to receive critical alerts'},
                    {key:'EMAIL_FROM',           hint:'Gmail address to send alerts from'},
                  ].map(({key,hint})=>(
                    <div key={key} className="mb-3">
                      <p className="text-xs font-mono text-green-400 mb-1">{key}</p>
                      <p className="text-xs" style={{color:'var(--muted)'}}>{hint}</p>
                      <p className="text-xs mt-0.5" style={{color:'rgba(107,140,114,0.5)'}}>Add to backend/.env file</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AppLayout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="bottom-right" toastOptions={{
        duration: 4000,
        style: { background:'#111a14', color:'#e8f5e9', border:'1px solid rgba(34,197,94,0.2)', fontFamily:'Space Mono, monospace', fontSize:'12px' },
        success: { iconTheme: { primary:'#22c55e', secondary:'#111a14' } },
        error:   { iconTheme: { primary:'#ef4444', secondary:'#111a14' } },
      }} />
    </BrowserRouter>
  )
}
