import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radio, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, register } from '../utils/api'

export default function Login() {
  const [mode,     setMode]     = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [farmName, setFarmName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!username || !password) { toast.error('Fill in all fields'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username, password)
        toast.success('Welcome back!')
      } else {
        await register(username, password, farmName || 'My Farm')
        toast.success('Account created!')
      }
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--bord)', borderRadius: 8,
    padding: '10px 14px', color: 'var(--text)',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="glass p-8 w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Radio size={20} className="text-green-400" />
          </div>
          <div>
            <p className="display text-lg text-white leading-tight">AgroSense AI</p>
            <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>Precision Agriculture v2</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all"
              style={{
                background: mode === m ? 'rgba(34,197,94,0.15)' : 'transparent',
                color:      mode === m ? '#4ade80' : 'var(--muted)',
                border:     mode === m ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
              }}>
              {m}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--muted)' }}>Username</label>
            <input style={inputStyle} placeholder="farmer_john" value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--muted)' }}>Farm Name</label>
              <input style={inputStyle} placeholder="Green Valley Farm" value={farmName}
                onChange={e => setFarmName(e.target.value)} />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--muted)' }}>Password</label>
            <div className="relative">
              <input style={{ ...inputStyle, paddingRight: 40 }}
                type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <button onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSubmit} disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all mt-2"
            style={{
              background: loading ? 'rgba(34,197,94,0.3)' : '#16a34a',
              color: 'white', fontFamily: 'Syne, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </motion.button>

          {/* Skip login button for demo */}
          <button onClick={() => { localStorage.setItem('token','demo'); navigate('/') }}
            className="w-full text-xs py-2 text-center transition-all"
            style={{ color: 'var(--muted)' }}
            onMouseOver={e => e.target.style.color = 'var(--text)'}
            onMouseOut={e  => e.target.style.color = 'var(--muted)'}>
            Skip login — use demo mode →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
