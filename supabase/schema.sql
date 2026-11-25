-- =============================================================================
-- WORDWISE PRODUCTION POSTGRESQL SCHEMA (SUPABASE)
-- Sprint 1: Database Foundation, RLS Policies & Auth Profile Trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  school_name TEXT DEFAULT 'High School Student',
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro_trial', 'pro')),
  xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 1,
  last_active_date DATE DEFAULT CURRENT_DATE,
  freeze_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. LESSONS TABLE (Reading Modules & Flashcard Decks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  difficulty TEXT,
  duration_minutes INTEGER DEFAULT 5,
  lesson_type TEXT CHECK (lesson_type IN ('reading', 'flashcard')),
  content JSONB DEFAULT '{}'::jsonb,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true
);

-- -----------------------------------------------------------------------------
-- 3. FLASHCARDS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  phonetic TEXT,
  part_of_speech TEXT,
  vietnamese_meaning TEXT NOT NULL,
  definition TEXT,
  example_sentence TEXT,
  synonyms JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 4. LESSON COMPREHENSION QUESTIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  sort_order INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 5. COUNTRIES TABLE (World Map Regions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  flag TEXT,
  map_x TEXT,
  map_y TEXT,
  unlocked BOOLEAN DEFAULT false,
  mission_title TEXT,
  sort_order INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 6. MISSIONS TABLE (Game Scenarios & Stages Data)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.missions (
  id TEXT PRIMARY KEY,
  country_id TEXT REFERENCES public.countries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  briefing JSONB DEFAULT '{}'::jsonb,
  learning_recap JSONB DEFAULT '{}'::jsonb,
  stages_data JSONB DEFAULT '{}'::jsonb,
  bonus_xp INTEGER DEFAULT 30
);

-- -----------------------------------------------------------------------------
-- 7. EVENTS TABLE (Community Events & Study Sprints)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  format_label TEXT,
  date_label TEXT,
  time_label TEXT,
  location TEXT,
  host TEXT,
  description TEXT,
  rewards TEXT,
  base_registered_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 8. USER LESSON PROGRESS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- -----------------------------------------------------------------------------
-- 9. USER MISSION PROGRESS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  country_id TEXT REFERENCES public.countries(id) ON DELETE CASCADE,
  completed_stages JSONB DEFAULT '[]'::jsonb,
  mission_completed BOOLEAN DEFAULT false,
  stamp_unlocked BOOLEAN DEFAULT false,
  badge_unlocked BOOLEAN DEFAULT false,
  gift_unlocked BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, country_id)
);

-- -----------------------------------------------------------------------------
-- 10. USER ACHIEVEMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- 11. EVENT REGISTRATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- ── Public / Authenticated Read Policies (Content & Leaderboard) ─────────────
DROP POLICY IF EXISTS "Public read access for profiles" ON public.profiles;
CREATE POLICY "Public read access for profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for lessons" ON public.lessons;
CREATE POLICY "Public read access for lessons"
  ON public.lessons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for flashcards" ON public.flashcards;
CREATE POLICY "Public read access for flashcards"
  ON public.flashcards FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for lesson_questions" ON public.lesson_questions;
CREATE POLICY "Public read access for lesson_questions"
  ON public.lesson_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for countries" ON public.countries;
CREATE POLICY "Public read access for countries"
  ON public.countries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for missions" ON public.missions;
CREATE POLICY "Public read access for missions"
  ON public.missions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read access for events" ON public.events;
CREATE POLICY "Public read access for events"
  ON public.events FOR SELECT
  USING (true);

-- ── Profiles Self-Mutation Policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ── User Lesson Progress Policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view own lesson progress"
  ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can insert own lesson progress"
  ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own lesson progress"
  ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can delete own lesson progress"
  ON public.user_lesson_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ── User Mission Progress Policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can view own mission progress"
  ON public.user_mission_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can insert own mission progress"
  ON public.user_mission_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can update own mission progress"
  ON public.user_mission_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can delete own mission progress"
  ON public.user_mission_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ── User Achievements Policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
CREATE POLICY "Users can update own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON public.user_achievements;
CREATE POLICY "Users can delete own achievements"
  ON public.user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- ── Event Registrations Policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own event registrations" ON public.event_registrations;
CREATE POLICY "Users can view own event registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own event registrations" ON public.event_registrations;
CREATE POLICY "Users can insert own event registrations"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own event registrations" ON public.event_registrations;
CREATE POLICY "Users can update own event registrations"
  ON public.event_registrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own event registrations" ON public.event_registrations;
CREATE POLICY "Users can delete own event registrations"
  ON public.event_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- AUTH SIGNUP TRIGGER: Automatically create public.profiles row for new users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    school_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'Global Explorer'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'school_name',
      'High School Student'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- VIDEO LESSONS TABLE (Admin CMS & Learning Library Video Player)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  youtube_url TEXT NOT NULL,
  duration_label TEXT DEFAULT '10 mins',
  category TEXT DEFAULT 'STEM',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT DEFAULT 'Intermediate'
    CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  domain TEXT DEFAULT 'AI & Tech'
    CHECK (domain IN ('AI & Tech', 'Engineering', 'Science', 'Daily Culture')),
  transcript_notes JSONB DEFAULT '[]'::jsonb,
  quiz_questions JSONB DEFAULT '[]'::jsonb
);

-- Language Immersion metadata (safe to re-run on existing databases)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Intermediate',
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'AI & Tech',
  ADD COLUMN IF NOT EXISTS transcript_notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_questions JSONB DEFAULT '[]'::jsonb;

-- Personal Word Bank (terms saved from Video Lessons)
CREATE TABLE IF NOT EXISTS public.user_saved_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  meaning TEXT NOT NULL DEFAULT '',
  source_video_title TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, term)
);

ALTER TABLE public.user_saved_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own saved words" ON public.user_saved_words;
CREATE POLICY "Users read own saved words" ON public.user_saved_words
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own saved words" ON public.user_saved_words;
CREATE POLICY "Users insert own saved words" ON public.user_saved_words
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own saved words" ON public.user_saved_words;
CREATE POLICY "Users update own saved words" ON public.user_saved_words
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own saved words" ON public.user_saved_words;
CREATE POLICY "Users delete own saved words" ON public.user_saved_words
  FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for videos" ON public.videos;
CREATE POLICY "Public read access for videos"
  ON public.videos FOR SELECT
  USING (true);

-- =============================================================================
-- ADMIN WRITE POLICIES (Sprint 6 — Content Management CMS)
-- Admins (profiles.role = 'admin') may INSERT / UPDATE / DELETE content tables.
-- Safe to re-run (idempotent).
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  content_tables TEXT[] := ARRAY[
    'lessons', 'flashcards', 'lesson_questions', 'countries', 'missions', 'events', 'videos'
  ];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins can insert %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can insert %1$s" ON public.%1$I FOR INSERT TO authenticated
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can update %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can update %1$s" ON public.%1$I FOR UPDATE TO authenticated
       USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can delete %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can delete %1$s" ON public.%1$I FOR DELETE TO authenticated
       USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);
  END LOOP;
END $$;


-- =============================================================================
-- COUNTRY CONTENT STUDIO (Admin CMS deep-edit per country)
-- Vocabulary, listening modules and mini-game assignments per country.
-- Safe to re-run (idempotent).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.country_vocabularies (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  term TEXT NOT NULL,
  phonetic TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT 'noun',
  vietnamese_meaning TEXT NOT NULL,
  definition TEXT DEFAULT '',
  example_sentence TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_listenings (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  title TEXT NOT NULL,
  transcript TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_games (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (country_id, game_type)
);

CREATE TABLE IF NOT EXISTS public.country_vocabulary_questions (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  word TEXT NOT NULL DEFAULT '',
  meaning TEXT NOT NULL DEFAULT '',
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_listening_questions (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Solar Grid Lab',
  transcript TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_sentence_rounds (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  target_sentence TEXT NOT NULL,
  word_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  round_number INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 20,
  time_limit INTEGER NOT NULL DEFAULT 20,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_speaking_turns (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  speaker_role TEXT NOT NULL DEFAULT 'GRID ENGINEER SAYS',
  npc_prompt TEXT NOT NULL,
  target_line TEXT NOT NULL,
  vietnamese_translation TEXT NOT NULL DEFAULT '',
  coach_tip TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_module_configs (
  country_id TEXT PRIMARY KEY,
  vocabulary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  listening_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  speaking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_games JSONB NOT NULL DEFAULT '["sentence_assembler"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.country_circuit_boards (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  board_number INTEGER NOT NULL DEFAULT 1,
  topic TEXT NOT NULL DEFAULT 'Renewable Energy & Smart Grid',
  pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  points INTEGER NOT NULL DEFAULT 20,
  time_limit INTEGER NOT NULL DEFAULT 20,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_tech_runner_questions (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.country_target_smasher_items (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  icon TEXT NOT NULL DEFAULT '🎯',
  prompt TEXT NOT NULL,
  correct_word TEXT NOT NULL,
  distractors JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.country_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_listenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_vocabulary_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_listening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_sentence_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_speaking_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_module_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_circuit_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_tech_runner_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_target_smasher_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  country_tables TEXT[] := ARRAY[
    'country_vocabularies',
    'country_listenings',
    'country_games',
    'country_vocabulary_questions',
    'country_listening_questions',
    'country_sentence_rounds',
    'country_speaking_turns',
    'country_module_configs',
    'country_circuit_boards',
    'country_tech_runner_questions',
    'country_target_smasher_items'
  ];
BEGIN
  FOREACH t IN ARRAY country_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can insert %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can insert %1$s" ON public.%1$I FOR INSERT TO authenticated
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can update %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can update %1$s" ON public.%1$I FOR UPDATE TO authenticated
       USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can delete %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Admins can delete %1$s" ON public.%1$I FOR DELETE TO authenticated
       USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin''))', t);
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- COMMUNITY FORUM (forum_posts, forum_comments, forum_votes)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_handle TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General'
    CHECK (category IN ('General', 'STEM & Tech', 'Speaking & Culture', 'Feedback', 'Off-topic')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.forum_rules (
  id TEXT PRIMARY KEY,
  rule_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read forum_rules" ON public.forum_rules;
CREATE POLICY "Public read forum_rules" ON public.forum_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage forum_rules" ON public.forum_rules;
CREATE POLICY "Admins manage forum_rules" ON public.forum_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_handle TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_votes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments(post_id);

-- Keep forum_posts.upvotes (net score) in sync with forum_votes
CREATE OR REPLACE FUNCTION public.forum_recount_votes() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid UUID;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.forum_posts
     SET upvotes = COALESCE((SELECT SUM(vote_type) FROM public.forum_votes WHERE post_id = pid), 0)
   WHERE id = pid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_forum_recount_votes ON public.forum_votes;
CREATE TRIGGER trg_forum_recount_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_recount_votes();

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  admin_check TEXT := 'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')';
BEGIN
  FOREACH t IN ARRAY ARRAY['forum_posts', 'forum_comments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);

    EXECUTE format('DROP POLICY IF EXISTS "Authors insert %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Authors insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid())', t);

    EXECUTE format('DROP POLICY IF EXISTS "Authors update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Authors update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (author_id = auth.uid() OR %2$s) WITH CHECK (author_id = auth.uid() OR %2$s)', t, admin_check);

    EXECUTE format('DROP POLICY IF EXISTS "Authors delete %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Authors delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (author_id = auth.uid() OR %2$s)', t, admin_check);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Read forum_votes" ON public.forum_votes;
CREATE POLICY "Read forum_votes" ON public.forum_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own insert forum_votes" ON public.forum_votes;
CREATE POLICY "Own insert forum_votes" ON public.forum_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Own update forum_votes" ON public.forum_votes;
CREATE POLICY "Own update forum_votes" ON public.forum_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Own delete forum_votes" ON public.forum_votes;
CREATE POLICY "Own delete forum_votes" ON public.forum_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
