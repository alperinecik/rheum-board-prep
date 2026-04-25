import { useState } from 'react'
import { BookMarked, Flag, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ReportModal } from './ReportModal'
import type { Question } from '../../types'

interface Props {
  question: Question
  userId: string
  onAnswer: (key: string) => void
  onNext: () => void
}

export function QuestionCard({ question, userId, onAnswer, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const revealed = selected !== null

  const handleSelect = async (key: string) => {
    if (revealed) return
    setSelected(key)
    onAnswer(key)
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', question.id)
      .single()
    setBookmarked(!!data)
  }

  const toggleBookmark = async () => {
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('question_id', question.id)
      setBookmarked(false)
    } else {
      await supabase.from('bookmarks').insert({ user_id: userId, question_id: question.id })
      setBookmarked(true)
    }
  }

  const optionClass = (key: string) => {
    const base = 'w-full text-left px-4 py-3.5 rounded-xl border text-sm leading-snug transition-all touch-manipulation '
    if (!revealed) return base + 'border-gray-200 active:bg-blue-50 active:border-blue-400'
    if (key === question.correct_answer) return base + 'border-green-400 bg-green-50 text-green-800 font-medium'
    if (key === selected) return base + 'border-red-400 bg-red-50 text-red-800'
    return base + 'border-gray-100 bg-gray-50 text-gray-400'
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{question.disease_area}</span>
          <div className="flex gap-1">
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-lg transition-colors touch-manipulation ${bookmarked ? 'text-blue-600 bg-blue-50' : 'text-gray-400 active:bg-blue-50'}`}
            >
              <BookMarked size={18} />
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="p-2 rounded-lg text-gray-400 active:bg-orange-50 active:text-orange-500 transition-colors touch-manipulation"
            >
              <Flag size={18} />
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="px-4 py-5">
          <p className="text-gray-900 font-medium leading-relaxed mb-5 text-[15px]">{question.question_text}</p>
          <div className="space-y-2.5">
            {question.options.map(opt => (
              <button key={opt.key} onClick={() => handleSelect(opt.key)} className={optionClass(opt.key)}>
                <span className="font-bold mr-2 text-gray-500">{opt.key}.</span>{opt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Answer reveal */}
        {revealed && (
          <div className="px-4 pb-5">
            <div className={`rounded-xl p-4 ${selected === question.correct_answer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {selected === question.correct_answer
                  ? <><CheckCircle size={18} className="text-green-600 shrink-0" /><span className="font-semibold text-green-800">Correct!</span></>
                  : <><XCircle size={18} className="text-red-600 shrink-0" /><span className="font-semibold text-red-800">Incorrect — Answer: {question.correct_answer}</span></>}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
              {question.guidelines && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  Source: {question.guidelines.title}{question.guidelines.year ? ` (${question.guidelines.year})` : ''}
                </p>
              )}
            </div>
            <button
              onClick={onNext}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm active:bg-blue-700 transition-colors touch-manipulation"
            >
              Next Question <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal questionId={question.id} userId={userId} onClose={() => setShowReport(false)} />
      )}
    </>
  )
}
