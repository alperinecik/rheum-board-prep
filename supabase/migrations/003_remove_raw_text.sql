-- Guidelines no longer store raw text — questions are generated directly by Claude
ALTER TABLE guidelines DROP COLUMN IF EXISTS raw_text;
ALTER TABLE guidelines DROP COLUMN IF EXISTS scraped_at;
