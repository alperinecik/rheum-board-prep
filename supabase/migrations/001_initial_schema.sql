-- Run this in your Supabase SQL editor

-- Users (simple PIN auth, PIN stored visible for admin)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACR guidelines indexed by disease area
CREATE TABLE IF NOT EXISTS guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_area TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  url TEXT NOT NULL UNIQUE,
  raw_text TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated MCQs linked to their source guideline
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  disease_area TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,       -- [{"key":"A","text":"..."},...]
  correct_answer TEXT NOT NULL, -- "A" | "B" | "C" | "D"
  explanation TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  prompt_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per user per answered question (upsert to update)
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- Bookmarked questions per user
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- Question reports with reason; drives prompt evolution
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('factually_wrong','unclear','outdated','other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versioned system prompts for question generation; latest version is used
CREATE TABLE IF NOT EXISTS generation_prompts (
  version SERIAL PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the initial generation prompt
INSERT INTO generation_prompts (system_prompt, reason) VALUES (
  'You are an expert rheumatology educator creating board exam preparation questions for rheumatology fellows. Generate high-quality multiple choice questions based on the provided ACR guideline excerpt.

Requirements:
- Each question must test clinically relevant knowledge from the guidelines
- Questions should reflect real board exam style (clinical vignettes preferred)
- 4 answer choices (A, B, C, D), exactly one correct
- Explanation must cite the specific guideline recommendation
- Mix difficulty: straightforward recall + nuanced clinical reasoning
- Cover diagnosis, treatment thresholds, monitoring, contraindications, special populations

Respond ONLY with a valid JSON array, no additional text:
[
  {
    "question": "...",
    "options": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
    "correct_answer": "A",
    "explanation": "..."
  }
]',
  'Initial prompt'
) ON CONFLICT DO NOTHING;

-- Disable RLS for all tables (small trusted user group)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE generation_prompts DISABLE ROW LEVEL SECURITY;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_questions_disease_area ON questions(disease_area);
CREATE INDEX IF NOT EXISTS idx_questions_guideline ON questions(guideline_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
