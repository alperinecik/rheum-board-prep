import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ProgressStats } from '../types'

export function useProgress(userId: string | undefined) {
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('user_answers')
        .select('is_correct, questions(disease_area)')
        .eq('user_id', userId)

      if (!data) { setLoading(false); return }

      const byArea: Record<string, { answered: number; correct: number }> = {}
      let totalAnswered = 0
      let totalCorrect = 0

      for (const row of data as any[]) {
        totalAnswered++
        if (row.is_correct) totalCorrect++
        const area = row.questions?.disease_area ?? 'Unknown'
        if (!byArea[area]) byArea[area] = { answered: 0, correct: 0 }
        byArea[area].answered++
        if (row.is_correct) byArea[area].correct++
      }

      setStats({ total_answered: totalAnswered, total_correct: totalCorrect, by_disease_area: byArea })
      setLoading(false)
    }

    load()
  }, [userId])

  return { stats, loading }
}
