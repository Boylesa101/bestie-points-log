# Bestie Points Log

Current version: `1.2.1`

Bestie Points Log is a cheerful mobile-first React app for tracking a child’s points. It now supports two modes from one shared codebase:

- `Local-only mode`: everything stays on one device in `localStorage`
- `Synced family mode`: two parent devices share one child log through a Cloudflare Worker, D1, and R2, while each phone still keeps a local offline cache

The frontend remains a PWA for Cloudflare Pages and stays ready for the existing Capacitor Android wrapper.

## What The App Does

- Cheerful splash screen and first-time setup flow
- Home screen with win/lose presets, custom point entry, history, and reward progress
- A separate parent `Account` hub for child profile, point buttons, rewards, sync/devices, settings, and help
- Gentle language checks for parent-entered custom wording, with calmer suggestions and a soft override
- Reward reveals with a full-screen `WELL DONE!` celebration, day out templates, and gated parent offer details
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
  - local daily reminder preference and time
  - local gentle language check preference
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

## Splash Screen

- The startup screen now uses the shorter child-facing branding `BESTIE POINTS`
- The old rainbow decoration has been removed so the splash stays cleaner and more balanced on phone screens
- Startup sound now looks for:

```text
public/sounds/coin.mp3
```

- If that file is missing or autoplay is blocked, the app falls back to a lightweight built-in coin-style chime and never crashes
- Splash audio still respects the local sound mute setting

## Home Vs Account

- `Home` stays focused on daily use:
  - child header
  - total points
  - win and lose actions
  - custom point entry
  - recent activity
  - reward progress and redeem flow
- `Account` is the parent hub:
  - `Edit child profile`
  - `Manage rewards`
  - `Manage point buttons`
  - `Sync & devices`
  - `Settings`
  - `Help & support`

This keeps the child-facing home screen cheerful and uncluttered while making parent tasks easier to find.

`Account -> Help & support` also shows the current app version and build hash so installed phones can be checked against the live deploy more easily.

## Linked Device Management

In `Account -> Sync & devices`, the primary device can:

- create a fresh sync code
- copy the current sync code
- see linked devices and last sync time
- revoke a linked device
- manually trigger a sync

Existing local-only users can migrate later from `Account -> Sync & devices`.

## Day Out Rewards And Reveal Flow

Rewards now support these categories:

- `sticker`
- `treat`
- `home`
- `day-out`

Day out rewards can store:

- venue template and editable venue name
- booking URL
- discount code
- offer source
- eligibility notes
- last checked date
- visible-before-unlock flag
- unlocked vs claimed state

Unlock behavior:

- when total points reaches the milestone, the reward becomes unlocked
- the celebration reveal runs once per unlock event
- unlocked and claimed are stored separately
- the reveal does not replay on every app reopen once it has been celebrated

Redeem behavior:

- `locked`: not enough points yet
- `unlocked`: enough points are available and the reward can be redeemed
- `redeemed`: the parent has redeemed it and, for spendable rewards, the points were deducted
- redeeming a spendable reward creates a history event and reduces the current total
- unlock-only rewards can still be marked as redeemed without spending points if that redemption type is chosen

The child-facing reveal stays playful and full-screen. Parent-only booking details are shown in a separate gated sheet so links, codes, and notes do not clutter the child view.

## Reward Celebration Audio

The reward reveal tries to play a dedicated celebration file at:

```text
public/sounds/reward-celebration.mp3
```

That file is treated as the trumpet / reward reveal sound.

Successful redemption also plays the existing `yay.mp3` sound alongside the trumpet celebration sound.

If the file is missing, invalid, or blocked by autoplay rules:

- the app does not crash
- the reveal still runs
- a lightweight built-in fallback fanfare is used when possible
- sound still respects the existing local mute setting

## Gentle Language Check

The app now softly checks parent-entered text in these places before save:

- custom points reasons in `Type points`
- editable win and lose preset labels
- reward titles
- reward descriptions
- reward notes and venue names

How it works:

- the check is rule-based and runs locally on the device
- it looks for a small starter list of harsh, shaming, insulting, or punitive phrases
- if wording is flagged, the app shows a calm `Are you sure?` prompt
- the parent can choose `Edit wording` or `Use anyway`
- the app can also show calmer phrase suggestions

The feature is intended as a gentle nudge, not a hard block or accusation.

Default device-local settings:

- `Gentle language check`: on
- `Show calmer wording suggestions`: on
- `Show support link in warnings`: on

Starter phrase categories include:

- insults: `stupid`, `idiot`, `dumb`
- shame language: `useless`, `pathetic`, `disgusting`
- aggressive labels: `bad boy`, `bad girl`, `horrible child`, `brat`
- rejection language: `I hate you`, `you’re awful`, `no one likes you`
- punitive phrasing: `punishment`, `punish`

Because this feature is device-local and tied to parent text-entry flows, it is not synced across family devices as a shared rule state.

## Parent Support

Warnings can link to a short support sheet with:

- `Family Lives`
  - Parenting and family support helpline
  - `0808 800 2222`
  - WhatsApp `07441 444125`
- `NSPCC Helpline`
  - For serious worries about a child’s safety
  - `0808 800 5000`

If there is immediate danger, contact local emergency services right away.

## PWA Update Prompt

- The PWA now uses a prompt-style service worker update flow
- When a new service worker is waiting, the app shows:
  - `New version available`
  - `A new version of Bestie Points Log is ready. Update now?`
- `Yes` activates the waiting service worker and reloads into the new version
- `No` dismisses the prompt for the rest of that session without interrupting the current screen

## Daily Reminders

Reminder settings live in `Account -> Settings`, and stay local to each phone.

Shared family sync does not force reminder preferences onto another parent device, because notification permissions and scheduling are device-specific.

### Android app build

- Uses Capacitor Local Notifications
- Schedules a repeating daily local notification for the chosen local time
- Default reminder time is `17:00`
- Notification title: `Bestie Points Log`
- Notification body: `Any points today?`
- Android 13+ requires notification permission
- Android exact alarm behavior depends on the device allowing scheduled exact alarms
- Tapping the reminder opens the app and routes the parent toward point entry

### Web / installed PWA fallback

- The web app does not pretend to guarantee an exact background lock-screen reminder
- Instead, once the app is opened or resumed after the chosen time, it checks whether any points were logged today
- If not, it shows an in-app prompt:
  - `Any points today?`
  - `Add points now`
  - `Not now`
- The reminder is only shown once per day on that device unless the next day starts
- If browser notification APIs are unavailable or denied, the app still works and falls back to the in-app prompt

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

Daily reminder scheduling for Android is wired through Capacitor Local Notifications and is refreshed from the saved reminder settings on app launch.

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
- A parent can migrate an existing local-only log to synced family mode from Account
- Migration uploads the current profile, child photo, presets, rewards, and point history to the shared backend
- Existing installs also auto-seed the newer local reminder settings, tone-check settings, reminder metadata, and notification permission state fields if they were missing
- Legacy local history uploaded during sync migration is now safely re-attributed to the creating device on the server so D1 foreign keys stay valid

## Current Limitations / Follow-Up Ideas

- Pair-code redemption is designed as one-time use and validated server-side, but could be hardened further with a stricter transactional flow
- Live push updates are interval/pull based today; a Durable Object or push channel could later make sync feel even more live
- Device name and parent display name updates are currently centered on setup and local settings; a dedicated remote device-profile edit flow would be a useful follow-up
