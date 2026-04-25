import { useState } from 'react'
import { Stethoscope } from 'lucide-react'

interface Props {
  onLogin: (username: string, pin: string) => void
  onRegister: (username: string, pin: string) => void
  loading: boolean
  error: string | null
}

export function LoginForm({ onLogin, onRegister, loading, error }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !pin.trim()) return
    if (mode === 'login') onLogin(username, pin)
    else onRegister(username, pin)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Stethoscope className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rheum Board Prep</h1>
          <p className="text-gray-500 text-sm mt-1">ACR Guidelines Question Bank</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setMode('register')}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. drsmith"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="4-digit PIN"
              maxLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !pin.trim()}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
