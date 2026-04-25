export interface User {
  id: string
  username: string
  created_at: string
}

export interface Guideline {
  id: string
  disease_area: string
  title: string
  year: number | null
  url: string
  raw_text: string | null
  scraped_at: string
}

export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  guideline_id: string
  disease_area: string
  question_text: string
  options: QuestionOption[]
  correct_answer: string
  explanation: string
  is_active: boolean
  prompt_version: number
  created_at: string
  guidelines?: Guideline
}

export interface UserAnswer {
  id: string
  user_id: string
  question_id: string
  selected_answer: string
  is_correct: boolean
  answered_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  question_id: string
  created_at: string
  questions?: Question
}

export interface QuestionReport {
  id: string
  user_id: string
  question_id: string
  category: 'factually_wrong' | 'unclear' | 'outdated' | 'other'
  notes: string | null
  created_at: string
}

export interface ProgressStats {
  total_answered: number
  total_correct: number
  by_disease_area: Record<string, { answered: number; correct: number }>
}
