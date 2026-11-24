# Gaslamp & Familiar

Solo-first Victorian-fantasy browser adventure (RS07-style click-to-walk) with Cloudflare auth + D1 cloud saves.

## Stack

- **Client:** Vite + TypeScript + Three.js
- **API / host:** Cloudflare Workers (serves `/api/*` + static assets)
- **DB:** Cloudflare D1

## Local development

```bash
npm install
npm run db:local --workspace=worker
# terminal A
npm run dev:api
# terminal B
npm run dev
```

Open http://127.0.0.1:5173 — API proxies to wrangler on :8787.

### Test login

- Username: `russell`
- Email: `russell@test.local`
- Password: `test1234`

Seeded automatically on first API request.

## Deploy (Cloudflare)

See [`docs` in the project store](../) or `/cursor/stores/self/docs/deploy-notes.md` for exact wrangler steps and secret names.

```bash
# once: create D1 + set secret
npx wrangler d1 create victorian-adventure
# put the returned database_id into worker/wrangler.toml
npx wrangler secret put JWT_SECRET
npm run db:migrate
npm run deploy
```

## Level-1 loop

1. Log in → appear in Brindlewick square.
2. Talk to **Mabel** → chop a **tree** → **Cast Spark** (burn logs → ashes / Magic XP) → return for **Light Orb** (feed 1000 ashes → lv2, then 250 oak logs → lv30).
3. Talk to **Holt** → mine copper/tin → smelt → craft lure → unlock **Street Ferret** (Catcher).
4. Train Catcher via combat, catch **Cobble Crow**, defeat **Mist Shade** on the outskirts road.
