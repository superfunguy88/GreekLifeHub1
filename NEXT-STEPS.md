# Next Steps for Greek Life Hub

You’re live on GitHub Pages with auth working. Here’s a practical order to tackle next.

---

## 1. Add a README (quick win)

So visitors and future-you know what the project is and how to run it.

- **In the repo:** Short description, how to open locally (e.g. Live Server or `npx serve .`), link to the live site, and pointer to `GOOGLE-SIGNIN-SETUP.md` if someone deploys their own copy.

---

## 2. Make one feature “real” with persistence

Right now events, donations, and messages are UI-only; nothing is stored. Pick **one** and connect it to a backend so data persists and is shared.

**Lowest-friction options:**

- **Supabase** (free tier) – Postgres + auth + real-time. Good for events (e.g. “Create event”, list, RSVP) or simple messages.
- **Firebase** (free tier) – Firestore + auth. Same idea: store events or messages, read/write from your existing JS.

**Practical path:** Use your existing Google Sign-In; have the backend accept the Google ID token, verify it, then allow read/write. Start with something small (e.g. “Upcoming events” list that anyone can see, and logged-in users can add one).

---

## 3. Verify Google tokens on the backend (when you add one)

You already decode the JWT in the browser. When you add an API:

- Send the Google `credential` (or the stored user’s token if you refresh it) to your backend.
- Verify the token server-side (e.g. Supabase/Firebase verify Google tokens; or use a JWT library + Google’s JWKS).
- Then create or look up the user in your DB and tie actions (e.g. “created this event”) to that user.

That way only real, signed-in users can do things that change data.

---

## 4. Polish and resilience

- **Offline / loading:** Show a clear “Loading…” or “Couldn’t load” when the app or a section depends on the network.
- **Errors:** If you add an API, show a simple message on failure (e.g. “Couldn’t save event; try again”) instead of failing silently.
- **Mobile:** Click targets and font sizes; test the auth modal and key flows on a phone.

---

## 5. Optional later

- **Custom domain** – Point a domain you own at GitHub Pages (or move to Vercel/Netlify and point it there).
- **App verification** – If you want to reduce the “This app isn’t verified” screen for Google Sign-In, go through Google’s app verification (only needed for wide/public use).
- **Analytics** – Simple page views or “Sign in” clicks so you can see usage.

---

**TL;DR:** Add a README, then pick one feature (e.g. events) and give it a real backend (Supabase or Firebase) so data persists and works across devices. After that, verify Google tokens on the server and add a bit of UX polish.
