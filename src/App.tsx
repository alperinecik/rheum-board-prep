import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/Auth/LoginForm'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './components/Dashboard/Dashboard'
import { QuizSession } from './components/Quiz/QuizSession'
import { BookmarksList } from './components/Bookmarks/BookmarksList'

export default function App() {
  const { user, loading, error, login, register, logout } = useAuth()

  if (!user) {
    return (
      <LoginForm
        onLogin={login}
        onRegister={register}
        loading={loading}
        error={error}
      />
    )
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={logout} />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/quiz" element={<QuizSession user={user} />} />
            <Route path="/bookmarks" element={<BookmarksList user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
