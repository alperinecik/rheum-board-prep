import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProgress } from '../../hooks/useProgress'
import { Target, BookMarked, TrendingUp, Play } from 'lucide-react'
import type { User } from '../../types'

interface Props { user: User }

export function Dashboard({ user }: Props) {
  const navigate = useNavigate()
  const { stats, loading } = useProgress(user.id)
  const [diseaseAreas, setDiseaseAreas] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [bookmarkCount, setBookmarkCount] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data: areas }, { count }] = await Promise.all([
        supabase.from('questions').select('disease_area').eq('is_active', true),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (areas) {
        const unique = [...new Set(areas.map((r: any) => r.disease_area))].sort()
        setDiseaseAreas(unique)
      }
      setBookmarkCount(count ?? 0)
    }
    load()
  }, [user.id])

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const startSession = () => {
    const query = selectedAreas.length > 0 ? `?areas=${encodeURIComponent(selectedAreas.join(','))}` : ''
    navigate(`/quiz${query}`)
  }

  const accuracy = stats && stats.total_answered > 0
    ? Math.round((stats.total_correct / stats.total_answered) * 100)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24 sm:pb-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Target className="text-blue-600" size={20} />} label="Answered" value={loading ? '—' : String(stats?.total_answered ?? 0)} />
        <StatCard icon={<TrendingUp className="text-green-600" size={20} />} label="Accuracy" value={loading ? '—' : accuracy !== null ? `${accuracy}%` : '—'} />
        <StatCard icon={<BookMarked className="text-purple-600" size={20} />} label="Bookmarks" value={String(bookmarkCount)} />
      </div>

      {/* Per-area accuracy */}
      {stats && Object.keys(stats.by_disease_area).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm">Progress by Disease Area</h2>
          <div className="space-y-3">
            {Object.entries(stats.by_disease_area)
              .sort((a, b) => b[1].answered - a[1].answered)
              .map(([area, data]) => {
                const pct = Math.round((data.correct / data.answered) * 100)
                return (
                  <div key={area}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{area}</span>
                      <span className="text-gray-400">{data.correct}/{data.answered} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Start session */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Start Study Session</h2>
        <p className="text-xs text-gray-400 mb-4">Select disease areas or leave unselected for a mixed session.</p>

        {diseaseAreas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No questions loaded yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {diseaseAreas.map(area => (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border touch-manipulation ${
                    selectedAreas.includes(area)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
            <button
              onClick={startSession}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3.5 rounded-xl font-semibold text-sm active:bg-blue-700 transition-colors touch-manipulation"
            >
              <Play size={18} /> Start{selectedAreas.length > 0 ? ` (${selectedAreas.length} areas)` : ' Mixed Session'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-center text-center gap-1">
      <div className="bg-gray-50 p-2 rounded-lg">{icon}</div>
      <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
