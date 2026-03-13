# Real user messaging setup (Supabase)

This app supports real user-to-user messaging: users can add each other as contacts and send DMs.

## 1. Run the database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. **Replace your old messages SQL** with the full migration:
   - Open **`supabase-migrations/RUN-THIS-REPLACEMENT.sql`** in your project.
   - Copy the entire file and paste it into the Supabase SQL Editor, then click **Run**.

   That script drops your old `messages` table (channel + sender_name) and creates the new tables (profiles, user_connections, conversations, messages with conversation_id + sender_id).

This creates:

- **profiles** – one per user (synced from Auth)
- **user_connections** – friend requests (pending / accepted)
- **conversations** – one per pair of users (DMs)
- **messages** – messages per conversation, with RLS

## 2. Enable Supabase Auth

1. In Supabase: **Authentication** → **Providers**.
2. Enable **Email** (and confirm email if you want).
3. Optional – **Google**: enable and add your app URL to Authorized redirect URIs if you use OAuth redirect.  
   The app can also use “Sign in with Google” via ID token (no redirect) if your project supports it.

## 3. Use the app

1. **Register** or **log in** with email (or Google). That creates/updates your profile.
2. Go to **Messages**.
3. Click **Add or find contacts**, search by name or username, and click **Add** to send a connection request.
4. When someone accepts, they appear under **Conversations**; click them to open the DM and send messages.

Pending requests appear at the top; click **Accept** to add that person as a contact and start chatting.
