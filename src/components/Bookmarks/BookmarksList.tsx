import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BookMarked, Trash2 } from 'lucide-react'
import type { User, Bookmark } from '../../types'

interface Props { user: User }

export function BookmarksList({ user }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookmarks')
        .select('*, questions(*, guidelines(title, year))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setBookmarks((data as Bookmark[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const removeBookmark = async (bookmarkId: string) => {
    await supabase.from('bookmarks').delete().eq('id', bookmarkId)
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
  }

  if (loading) return <div className="flex justify-center p-12 text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24 sm:pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BookMarked className="text-blue-600" size={22} /> Bookmarked Questions
      </h1>

      {bookmarks.length === 0 ? (
        <p className="text-gray-400 text-sm">No bookmarks yet. Star questions during a study session.</p>
      ) : (
        <div className="space-y-3">
          {bookmarks.map(bm => {
            const q = bm.questions as any
            if (!q) return null
            const isExpanded = expanded === bm.id
            return (
              <div key={bm.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="px-5 py-4 cursor-pointer flex items-start justify-between gap-4"
                  onClick={() => setExpanded(isExpanded ? null : bm.id)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide block mb-1">
                      {q.disease_area}
                    </span>
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">{q.question_text}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeBookmark(bm.id) }}
                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    <div className="space-y-2 mb-3">
                      {q.options?.map((opt: any) => (
                        <div
                          key={opt.key}
                          className={`px-3 py-2 rounded-lg text-sm ${opt.key === q.correct_answer ? 'bg-green-50 text-green-800 font-medium border border-green-200' : 'bg-gray-50 text-gray-500'}`}
                        >
                          <span className="font-semibold mr-1">{opt.key}.</span> {opt.text}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                    {q.guidelines && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        Source: {q.guidelines.title}{q.guidelines.year ? ` (${q.guidelines.year})` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
