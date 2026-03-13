# Messages System Setup (Supabase)

The Messages section can store messages in **Supabase** so they persist and sync across devices. Follow these steps once to enable it.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (free account).
2. Click **New project** → pick your org, name (e.g. `greeklife`), database password, and region → **Create project**.
3. Wait for the project to finish provisioning.

---

## 2. Create the messages table

1. In the Supabase dashboard, open **SQL Editor**.
2. Click **New query** and paste the SQL below.
3. Run it (Run button).

```sql
-- Messages table: one row per message, grouped by channel
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  channel text not null,
  sender_name text not null default 'Guest',
  body text not null,
  created_at timestamptz default now()
);

-- Index for loading messages by channel
create index if not exists messages_channel_created_at
  on public.messages (channel, created_at);

-- Allow the app (anon key) to read and insert messages
alter table public.messages enable row level security;

drop policy if exists "Allow read messages" on public.messages;
create policy "Allow read messages" on public.messages
  for select using (true);

drop policy if exists "Allow insert messages" on public.messages;
create policy "Allow insert messages" on public.messages
  for insert with check (true);
```

After it runs, you should see the table under **Database** → **Tables**: in the left tree it’s under the **public** schema as **messages**. (“public” is the schema name; the table name is “messages”.)

---

## 3. Enable Realtime (optional but recommended)

So new messages appear live without refreshing:

1. In the Supabase dashboard left sidebar, go to **Database** → **Publications**.
   - Direct link: [Database → Publications](https://supabase.com/dashboard/project/_/database/publications) (opens your project’s publications).
2. Under the **supabase_realtime** publication, find the table **messages** (it’s in the `public` schema; the UI usually shows the table name as **messages**, not “public.messages”).
3. **Toggle it ON** so the table is part of the publication.

**If you don’t see “messages” in the list:** run Step 2 first (create the table with the SQL above), then refresh the Publications page. New tables show up there after they’re created.

**Alternative – do it with SQL:** In **SQL Editor**, run:

```sql
alter publication supabase_realtime add table public.messages;
```

---

## 4. Add your keys to the app

1. In Supabase: **Project Settings** (gear) → **API**.
2. Copy **Project URL** and **anon public** (under "Project API keys").
3. In this project, open **index.html**.
4. Find the script block that sets `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY`.
5. Paste your URL and anon key:

```html
<script>
  window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  window.SUPABASE_ANON_KEY = 'your-anon-key-here';
</script>
```

Save and reload the app. Open **Messages**, pick a contact (channel), and send a message — it will be stored in Supabase and visible on other devices.

---

## Channels

Each "contact" in the Messages UI is a **channel**. Messages are shared per channel:

| Contact            | Channel slug        |
|--------------------|---------------------|
| Chapter President  | `chapter-president` |
| Alumni Coordinator | `alumni-coordinator`|
| Sarah Johnson      | `sarah-johnson`     |
| Mike Chen          | `mike-chen`         |

Anyone can read and send in any channel. The sender name comes from your Greek Life Hub login (Google or demo); if not logged in, it shows "Guest".

---

## If you don’t configure Supabase

Messages still work in **demo mode**: you can open chats and send, and the app will show fake auto-replies. Nothing is saved. Once you add your Supabase URL and anon key, the same UI will use the database and real-time updates.
