# Bestie Points Log

Bestie Points Log is a cheerful mobile-first React app for tracking a child’s points. It now supports two modes from one shared codebase:

- `Local-only mode`: everything stays on one device in `localStorage`
- `Synced family mode`: two parent devices share one child log through a Cloudflare Worker, D1, and R2, while each phone still keeps a local offline cache

The frontend remains a PWA for Cloudflare Pages and stays ready for the existing Capacitor Android wrapper.

## What The App Does

- Cheerful splash screen and first-time setup flow
- Home screen with win/lose presets, custom point entry, history, rewards, and settings
- Parent-managed profile, presets, rewards, sounds, PIN lock, export/import, and device management
- Local-first offline behavior with background sync when family mode is enabled
- PWA install support for Android-class phones

## Local-Only Vs Synced Family Mode

### Local-only mode

- Uses only browser `localStorage`
- No backend is required
- Points, presets, rewards, history, and settings stay on one device

### Synced family mode

- First device creates the family log and gets a short pairing code
- Second device joins with that pairing code
- Shared across devices:
  - child profile and photo
  - total points
  - point history
  - presets
  - rewards
- Device-local:
  - local mute preference
  - local PIN lock
  - local device name
  - local cache and sync metadata

## Sync Architecture

### Frontend

- React + TypeScript + Vite
- Local-first app state with:
  - local cache
  - sync session metadata
  - queued unsynced mutations
- Point totals are derived from point events, not by last-write-wins on a single total field

### Backend

- Cloudflare Worker API in `worker/src`
- D1 for shared relational data
- R2 for synced child photos

### Data model highlights

- Point changes are append-only events with unique ids
- Events are deduplicated by id on the server
- Shared profile, presets, and rewards use last-write-wins with timestamps and soft deletes
- Devices authenticate with a long random device token after pairing
- Pairing codes are short, time-limited, and one-time use

## Offline Queueing

When family sync is enabled:

- Taps still update the UI immediately on the current device
- New changes are added to a local mutation queue
- The app pushes queued changes when the network returns
- The app pulls remote updates on app open, app resume, after local changes, and on a light foreground interval
- A subtle sync status pill shows `Local only`, `Syncing`, `Synced`, `Offline`, or `Sync issue`

## First Device Setup

1. Open the app.
2. Choose `Create new Bestie Points Log`.
3. Add the child name and photo.
4. Turn on `Use sync across two parent devices`.
5. Enter the parent display name and device name.
6. Continue to create the family.
7. The app shows a sync code for the second phone.

## Second Device Join

1. Open the app on the second phone.
2. Choose `Join with sync code`.
3. Enter the sync code.
4. Enter the parent display name and optional device name.
5. Finish setup.

The second phone pulls the current shared child profile, photo, points, history, presets, rewards, and linked-device state.

## Linked Device Management

In `Settings -> Family sync`, the primary device can:

- create a fresh sync code
- copy the current sync code
- see linked devices and last sync time
- revoke a linked device
- manually trigger a sync

Existing local-only users can migrate later from `Settings -> Family sync -> Upgrade this log to synced family mode`.

## Backup Export / Import

- Export downloads a JSON file with the full app snapshot and schema metadata
- Import validates and sanitizes the file before it is applied
- Import asks for confirmation before replacing current local data
- Invalid or corrupt files are rejected safely

If the imported backup contains sync session data, that device will restore the synced family link from the imported snapshot.

## Project Structure

```text
src/
  components/
  hooks/
  lib/
    api/
    sync/
  screens/
  types/

worker/
  src/
    lib/
    index.ts
    schema.sql
  wrangler.toml
```

## Install Dependencies

```bash
npm install
```

## Local Web Development

Run the Vite frontend:

```bash
npm run dev
```

Optional local frontend env for synced mode:

```bash
cp .env.example .env.local
```

Then set:

```bash
VITE_SYNC_API_BASE_URL=http://127.0.0.1:8787
```

## Local Worker Development

Before local worker dev, update `worker/wrangler.toml` with your real D1 database id, bucket name, and allowed origin, or create local equivalents.

Apply the schema:

```bash
npx wrangler d1 execute bestie-points-log --file=worker/src/schema.sql --config worker/wrangler.toml
```

Run the Worker locally:

```bash
npm run worker:dev
```

The frontend can then talk to the Worker using `VITE_SYNC_API_BASE_URL=http://127.0.0.1:8787`.

## Production Build

Build the frontend:

```bash
npm run build
```

Preview the built frontend:

```bash
npm run preview
```

Output directory:

```text
dist/
```

## Validation

Run all checks:

```bash
npm run build
npm run lint
npm run worker:check
```

## Android With Capacitor

Build the frontend for Capacitor:

```bash
npm run build
```

Sync into the Android project:

```bash
npm run cap:sync
```

Or run both together:

```bash
npm run android:sync
```

Open Android Studio:

```bash
npm run cap:open
```

Native project path:

```text
android/
```

Typical Android Studio build outputs:

```text
android/app/build/outputs/
```

## Cloudflare Worker Setup

### 1. Create D1

```bash
npx wrangler d1 create bestie-points-log
```

Copy the returned database id into `worker/wrangler.toml`.

### 2. Create R2 bucket

```bash
npx wrangler r2 bucket create bestie-points-log-photos
```

Update the bucket name in `worker/wrangler.toml` if you use a different one.

### 3. Apply the schema

```bash
npx wrangler d1 execute bestie-points-log --file=worker/src/schema.sql --config worker/wrangler.toml
```

### 4. Set Worker vars

In `worker/wrangler.toml`, set:

- `PAIR_CODE_TTL_MINUTES`
- `ALLOWED_ORIGIN` via dashboard secret/var or local config

Recommended `ALLOWED_ORIGIN` values:

- your Pages production URL
- your Pages preview URL pattern or custom domain

### 5. Deploy the Worker

```bash
npx wrangler deploy --config worker/wrangler.toml
```

## Cloudflare Pages Setup

### Pages build settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

### Pages environment variables

Set this on Pages:

```bash
VITE_SYNC_API_BASE_URL=https://<your-worker-subdomain>.workers.dev
```

If you later put the Worker behind the same custom domain under `/api`, you can instead point the variable at that API origin.

### Pages deployment steps

1. Push the repository to GitHub.
2. Create a Cloudflare Pages project from the repo.
3. Use the Pages build settings above.
4. Add `VITE_SYNC_API_BASE_URL`.
5. Deploy.

## Data Storage Keys

Local device storage still uses separate `localStorage` keys:

- `bestie-points-log/profile`
- `bestie-points-log/total-points`
- `bestie-points-log/presets`
- `bestie-points-log/history`
- `bestie-points-log/rewards`
- `bestie-points-log/metadata`
- `bestie-points-log/settings`
- `bestie-points-log/sync-session`
- `bestie-points-log/mutation-queue`

## Migration Notes

- Existing local-only installs keep working
- Older local snapshots are sanitized and upgraded automatically
- A parent can migrate an existing local-only log to synced family mode from settings
- Migration uploads the current profile, child photo, presets, rewards, and point history to the shared backend

## Current Limitations / Follow-Up Ideas

- Pair-code redemption is designed as one-time use and validated server-side, but could be hardened further with a stricter transactional flow
- Live push updates are interval/pull based today; a Durable Object or push channel could later make sync feel even more live
- Device name and parent display name updates are currently centered on setup and local settings; a dedicated remote device-profile edit flow would be a useful follow-up
