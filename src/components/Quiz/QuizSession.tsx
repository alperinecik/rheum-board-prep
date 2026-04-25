import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QuestionCard } from './QuestionCard'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import type { Question, User } from '../../types'

interface Props { user: User }

export function QuizSession({ user }: Props) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const areas = searchParams.get('areas')?.split(',').filter(Boolean) ?? []

  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  const loadNextQuestion = useCallback(async () => {
    setLoading(true)

    // Get IDs already answered by this user
    const { data: answered } = await supabase
      .from('user_answers')
      .select('question_id')
      .eq('user_id', user.id)

    const answeredIds = (answered ?? []).map((r: any) => r.question_id)

    let query = supabase
      .from('questions')
      .select('*, guidelines(title, year, disease_area)')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)

    if (areas.length > 0) query = query.in('disease_area', areas)
    if (answeredIds.length > 0) query = query.not('id', 'in', `(${answeredIds.join(',')})`)

    const { data } = await query

    if (!data || data.length === 0) {
      setExhausted(true)
      setQuestion(null)
    } else {
      setQuestion(data[0] as Question)
      setExhausted(false)
    }
    setLoading(false)
  }, [user.id, areas.join(',')])

  useEffect(() => { loadNextQuestion() }, [loadNextQuestion])

  const handleAnswer = async (selectedKey: string) => {
    if (!question) return
    const isCorrect = selectedKey === question.correct_answer

    await supabase.from('user_answers').upsert({
      user_id: user.id,
      question_id: question.id,
      selected_answer: selectedKey,
      is_correct: isCorrect,
    }, { onConflict: 'user_id,question_id' })

    setSessionCount(c => c + 1)
  }

  const handleNext = () => loadNextQuestion()

  const handleGenerateMore = async () => {
    setGenerating(true)
    // Notify user and instruct them to run the script
    // In a full deployment, this would call a Supabase Edge Function
    setTimeout(() => {
      setGenerating(false)
      alert('To generate more questions, run:\n\nnpm run generate\n\nThen refresh this page.')
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={28} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24 sm:pb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        <span className="text-sm text-gray-400">{sessionCount} answered this session</span>
      </div>

      {exhausted ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-lg font-semibold text-gray-800 mb-2">You've answered all available questions!</p>
          <p className="text-sm text-gray-500 mb-6">
            {areas.length > 0
              ? `No more unseen questions for: ${areas.join(', ')}.`
              : 'No more unseen questions in the database.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleGenerateMore}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Requesting...' : 'Generate More Questions'}
            </button>
          </div>
        </div>
      ) : question ? (
        <QuestionCard
          question={question}
          userId={user.id}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      ) : null}
    </div>
  )
}
