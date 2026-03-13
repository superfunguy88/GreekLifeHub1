-- =============================================================================
-- REPLACEMENT: Run this *instead of* your old messages SQL.
-- This removes the old channel-based messages table and sets up real user DMs.
-- Paste the whole file into Supabase → SQL Editor → Run.
-- =============================================================================

-- Step 1: Remove your old messages table (and its policies/index)
DROP POLICY IF EXISTS "Allow read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
DROP TABLE IF EXISTS public.messages;

-- Step 2: New schema for real user messaging
-- -----------------------------------------------------------------------------

-- Profiles: one per auth user (synced from Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  username TEXT,
  email TEXT,
  chapter TEXT,
  role TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, picture, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)))
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
    picture = COALESCE(EXCLUDED.picture, profiles.picture),
    username = COALESCE(NULLIF(EXCLUDED.username, ''), profiles.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User connections (friend requests)
CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_to_status ON public.user_connections(to_user_id, status);

-- Conversations: one row per pair of users (DMs)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_pair
  ON public.conversations (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- Messages: per conversation (replaces old channel-based table)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own connections" ON public.user_connections;
CREATE POLICY "Users can view own connections"
  ON public.user_connections FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can send connection requests" ON public.user_connections;
CREATE POLICY "Users can send connection requests"
  ON public.user_connections FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can accept connection requests" ON public.user_connections;
CREATE POLICY "Users can accept connection requests"
  ON public.user_connections FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS "Users can create conversation" ON public.conversations;
CREATE POLICY "Users can create conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.messages;
CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );
