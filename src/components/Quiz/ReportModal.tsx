import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { QuestionReport } from '../../types'

type Category = QuestionReport['category']

const CATEGORIES: { value: Category; label: string; desc: string }[] = [
  { value: 'factually_wrong', label: 'Factually Wrong', desc: 'The correct answer or explanation is incorrect' },
  { value: 'unclear', label: 'Unclear', desc: 'Question wording is ambiguous or confusing' },
  { value: 'outdated', label: 'Outdated', desc: 'Based on superseded guidelines' },
  { value: 'other', label: 'Other', desc: 'Something else is wrong' },
]

interface Props {
  questionId: string
  userId: string
  onClose: () => void
}

export function ReportModal({ questionId, userId, onClose }: Props) {
  const [category, setCategory] = useState<Category | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!category) return
    setSubmitting(true)
    await supabase.from('question_reports').insert({
      user_id: userId,
      question_id: questionId,
      category,
      notes: notes.trim() || null,
    })
    setDone(true)
    setSubmitting(false)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Report Question</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center text-green-700 font-medium">
            Thank you — your feedback helps improve questions.
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-gray-500">What's wrong with this question?</p>

            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    category === cat.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-800">{cat.label}</div>
                  <div className="text-gray-500">{cat.desc}</div>
                </button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional: add details..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            <button
              onClick={handleSubmit}
              disabled={!category || submitting}
              className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
