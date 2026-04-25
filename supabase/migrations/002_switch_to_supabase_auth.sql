-- Run this in Supabase SQL Editor AFTER migration 001

-- Drop FK constraints pointing to our custom users table
ALTER TABLE user_answers DROP CONSTRAINT IF EXISTS user_answers_user_id_fkey;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE question_reports DROP CONSTRAINT IF EXISTS question_reports_user_id_fkey;

-- Drop the custom users table (auth handled by Supabase Auth now)
DROP TABLE IF EXISTS users;

-- Re-add FK constraints pointing to Supabase's built-in auth.users
ALTER TABLE user_answers ADD CONSTRAINT user_answers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE question_reports ADD CONSTRAINT question_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on user-owned tables
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_prompts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read questions and guidelines
CREATE POLICY "read questions" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "read guidelines" ON guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "read prompts" ON generation_prompts FOR SELECT TO authenticated USING (true);

-- Users can only access their own rows
CREATE POLICY "own answers" ON user_answers FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own bookmarks" ON bookmarks FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own reports" ON question_reports FOR ALL TO authenticated USING (user_id = auth.uid());
