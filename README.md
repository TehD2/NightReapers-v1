# NightReapers

Personal route and shift logger with Sleep and Waiting modes.

## Files
- `index.html` — dashboard and dialogs
- `style.css` — styling and transitions
- `app.js` — route tracking, saved history, reports and animations
- `assets/` — NightReapers artwork

## Run locally
Open `index.html` in a browser. For deployment, serve the contents of this folder from a static website host.

## Data and backups
Route records are stored locally in the browser under `nightreapers_v1`, not in this repository. Use **Settings → Export Backup** to save a JSON copy. The app currently has no JSON import feature. Switching browser or website address may make existing records unavailable at the new address.

## Privacy
This is a public-source-ready project folder. Do not commit exported shift records, private notes, credentials or workplace-confidential information.

## Current limitations
Offline installation/PWA support has not been added or verified. The End Route safety confirmation is postponed pending field testing.
