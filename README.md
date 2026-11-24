# NightReapers — Personal Logger

**Version:** v1.06  
**Update:** #021 — Task Logger  
**Updated:** November 24, 2026  
**Status:** Pending field testing

A local-first personal workday, task and route logger with Sleep and Waiting modes.

## Features

- Start and End Workday controls.
- Automatic task timestamp recording.
- Route tracking with starting and ending odometer readings.
- Strict 30-minute unpaid break timer.
- Paid Hours and estimated Weekly Gross calculations.
- Collapsible Task History and Route History.
- Expandable monthly, pay-period and daily task records.
- View All / Show Less route history.
- Editing of the latest completed workday and route.
- Saved vehicle and route information.
- JSON backup, restore and email-sharing options.
- Weekly Gross visibility toggle.

## Task Logger

The following tasks are available during an active workday:

| | |
|---|---|
| Package Handler | Training |
| Route 6184 | Vehicle Movement |
| Break | Janitorial |

Selecting another task automatically closes the previous task and records the next starting timestamp.

Unassigned time counts toward paid hours. Break time is automatically deducted.

## Files

- `index.html` — dashboard, settings and dialogs.
- `style.css` — visual styling, layouts and transitions.
- `app.js` — application logic, workday tracking, route tracking, history, payroll estimates, backups and animations.
- `assets/` — NightReapers artwork.
- `README.md` — project documentation.
- `CLEANUP_NOTES.txt` — development and update history.

## Run locally

Open `index.html` in a browser or serve the project using a local development server.

For deployment, serve the project folder from a static website host.

## Data and backups

Application records are stored locally in the browser using the existing storage key `nightreapers_v1`.

Records are not stored inside the project repository.

Backup and restore options are available through Settings.

Export a backup before:

- Updating application files.
- Switching browsers or devices.
- Clearing browser storage.
- Importing another backup.

Email sharing requires a compatible sharing or email application. Manual attachment is available as a fallback.

## Payroll estimates

Weekly Gross is calculated using recorded paid hours and the configured base hourly rate.

Unpaid breaks are excluded. Overtime, special pay rates and Dayforce reconciliation are planned for future updates.

NightReapers is a personal tracking tool and does not replace official payroll records.

## Privacy

Do not commit exported workday records, route records, private notes, payroll information, credentials or workplace-confidential information.

Full backups are intended for personal use.

Management work reports must exclude private payroll information.

## Current limitations

- Full offline operation and PWA reliability require verification.
- Honeywell CT60 and Android 7.1.1 compatibility require device testing.
- Dayforce integration is not implemented.
- Advanced overtime and special-rate calculations are not implemented.
- End Route safety confirmation remains subject to field testing.
- Update #021 requires local and field testing before production deployment.

## Development roadmap

- Validate Task Logger functionality.
- Verify existing record compatibility.
- Test backup and restore.
- Verify interrupted workday recovery.
- Implement verified payroll calculations.
- Prepare Android APK packaging.

## Support

Support the Reaper through the existing Ko-fi link.

**NightReapers — Personal Logger**