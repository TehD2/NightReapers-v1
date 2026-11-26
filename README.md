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

#022 / v1.07 — Active route patch
Route controls replace workday controls; arrival/departure timestamps, optional fuel top-up notes, post-trip inspection, midnight display and version label. Existing storage key retained. Task History and Weekly Gross now use Sunday–Saturday payroll weeks; other payroll and analytics changes deferred. Older backups are regrouped by workday start date without altering timestamps. Device testing required.


#022 final revision: Payroll start is editable; FMAS ledger remains Sunday–Saturday. Latest workday deletion also removes exclusively linked routes after confirmation. Route button follows selected preset. Top Ups appear between route start and end.

#022 deletion refinement: inline muted-red X, latest eligible record only, no deletion during active work, YES then exact DELETE. Eligibility persists in backups; deleting does not unlock older records. Route deletion retains linked paid task time with a removed-record label; workday deletion retains saved routes. Payroll week remains editable independently of Sunday–Saturday FMAS grouping. Top Ups remain between route start/end in Task History.
