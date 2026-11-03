# SpendWise

A private, offline-first personal expense tracker for India, built as an installable Progressive Web App.

SpendWise keeps **personal spending** separate from **transfers** (for example money sent to your father), **income**, **savings** and **investments**. Only expenses count as personal spending. All amounts are stored as integer paise and shown in Indian Rupees with Indian digit grouping (₹1,25,000).

**Your data never leaves your device.** There is no server, no account, no cloud database, no analytics and no tracking. The hosting service only delivers the app files; your transactions live in your browser's IndexedDB.

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Node.js on Windows](#2-install-nodejs-on-windows)
3. [Extract the ZIP](#3-extract-the-zip)
4. [Install dependencies](#4-install-dependencies)
5. [Run locally](#5-run-locally)
6. [Run the tests](#6-run-the-tests)
7. [Lint and TypeScript checks](#7-lint-and-typescript-checks)
8. [Production build](#8-production-build)
9. [Upload to GitHub](#9-upload-to-github)
10. [Deploy (GitHub Pages, Cloudflare Pages, others)](#10-deploy)
11. [Install on iPhone](#11-install-on-iphone)
12. [Back up and restore](#12-back-up-and-restore)
13. [How local storage works](#13-how-local-storage-works)
14. [Updating the app safely](#14-updating-the-app-safely)

Also: [Features](#features), [Project structure](#project-structure), [Money and calculation rules](#money-and-calculation-rules), [Troubleshooting](#troubleshooting).

---

## 1. Prerequisites

- **Node.js 20 LTS or newer** (includes npm). Tested with Node 20 and 22.
- **Git** (only needed to upload to GitHub): https://git-scm.com/download/win
- A GitHub account (for hosting), or a Cloudflare account.
- An iPhone with **Safari** (iOS 16.4 or newer recommended).

## 2. Install Node.js on Windows

1. Go to https://nodejs.org and download the **LTS** Windows Installer (`.msi`).
2. Run it and accept the defaults (keep "Add to PATH" ticked).
3. Open a **new** PowerShell or Command Prompt window and check:
   ```powershell
   node -v
   npm -v
   ```
   Both should print version numbers (Node should be v20 or higher).

## 3. Extract the ZIP

1. Right-click `spendwise.zip` → **Extract All…** → choose a folder such as `C:\Projects\`.
2. You should now have `C:\Projects\spendwise\` containing `package.json`, `src\`, `public\` and this README.
3. Open PowerShell in that folder:
   ```powershell
   cd C:\Projects\spendwise
   ```

> Avoid extracting inside OneDrive-synced folders; syncing `node_modules` is slow.

## 4. Install dependencies

```powershell
npm install
```

This uses `package-lock.json` so you get exactly the tested versions. (`npm ci` also works and is stricter.)

## 5. Run locally

```powershell
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The service worker is disabled in dev mode so changes appear immediately.

To test the real production build including offline support:

```powershell
npm run build
npm run preview
```

then open http://localhost:4173.

> Data you enter on `localhost` is stored in that browser for `localhost` only. It is separate from your deployed site.

## 6. Run the tests

```powershell
npm test
```

Runs the Vitest suite (65 tests) against a simulated IndexedDB (`fake-indexeddb`). It covers:

- rupee ↔ paise conversion, Indian formatting, float-drift safety
- expense totals, and that transfers, savings and investments are excluded from expenses
- income totals, monthly summaries, like-for-like previous-period comparisons
- category and payment-method breakdowns, budgets
- daily/weekly/monthly series that tell "no records" apart from "₹0 spent"
- transaction filtering, searching, sorting and date ranges
- adding, editing, deleting and persisting transactions
- category reassignment on delete
- JSON backup export, import validation, v1 → v2 backup migration
- duplicate and conflict detection, merge and replace restores, rollback on failure
- CSV export, quoting and spreadsheet formula-injection protection
- IndexedDB schema migration from v1 to v2

Watch mode while developing: `npm run test:watch`.

## 7. Lint and TypeScript checks

```powershell
npm run typecheck
npm run lint
```

Run everything (types, lint, tests, build) in one go:

```powershell
npm run check
```

## 8. Production build

```powershell
npm run build
```

Output goes to `dist\`. It contains only static files (HTML, JS, CSS, icons, manifest, service worker). Any static host can serve it.

All asset paths are **relative**, so the same `dist\` folder works wherever you put it: the root of a domain, a GitHub Pages project URL like `https://<user>.github.io/spendwise/`, or any sub-folder. No base-path configuration is needed.

## 9. Upload to GitHub

1. Create a new repository at https://github.com/new, for example `spendwise`. Public or private both work (Pages on private repos requires a paid plan).
   Do **not** add a README or .gitignore there — the project already has them.
2. In PowerShell inside the project folder:
   ```powershell
   git init
   git add .
   git commit -m "SpendWise initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/spendwise.git
   git push -u origin main
   ```
3. The `.gitignore` excludes `node_modules`, `dist`, and any `spendwise-backup-*.json` / `spendwise-*.csv` files so personal exports are never committed by accident. **Never commit your backups.**

## 10. Deploy

### Option A — GitHub Pages (project URL, recommended)

The repo includes `.github/workflows/deploy.yml`. It installs dependencies, runs type checks, lint and tests, builds, and publishes the built `dist` folder to Pages.

1. On GitHub open your repo → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
   ⚠️ Do **not** use "Deploy from a branch". That publishes the raw source code, which browsers cannot run, and you get the "SpendWise could not start" screen (or a blank page).
3. Push to `main` (or open **Actions → Deploy to GitHub Pages → Run workflow**).
4. When it finishes, your app is at:
   `https://<your-username>.github.io/<repo-name>/`

Routing uses URL hashes (`/#/reports`), so deep links and refreshes work on GitHub Pages without any 404 workaround.

The same workflow works unchanged for a **user site** (`<username>.github.io` repo) or a **custom domain**.

### Option B — Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
2. Framework preset: **None** (or Vite).
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
3. Deploy. You get `https://<project>.pages.dev`.

### Other static hosts (Netlify, Vercel, any web server)

Build with `npm run build` and upload the **contents of `dist/`** (not the project folder) to any location served over **HTTPS**. It works from the root or any sub-folder.

Requirements for any host: HTTPS (service workers and installation require it), and `sw.js` must not be cached for long by the CDN (default settings on the hosts above are fine).

## 11. Install on iPhone

1. Open your deployed URL in **Safari** (installation from other iOS browsers is limited).
2. Wait until the app loads fully. A message "SpendWise is ready to work offline" appears once all files are cached.
3. Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Open SpendWise from the Home Screen icon. It runs full-screen as a standalone app.
5. From now on, always open it from the Home Screen icon.

> **Important:** the Home Screen app and the Safari tab have **separate storage on iPhone**. Data entered in a Safari tab will not appear in the installed app. Enter your real data only in the installed app.

After installation SpendWise works without internet: you can open it, add, edit, delete and view everything offline.

## 12. Back up and restore

**Back up** (do this regularly — at least every week or two; Settings shows a warning after 14 days):

1. Settings → **Back up now**.
2. On iPhone the share sheet opens: choose **Save to Files** (e.g. iCloud Drive or On My iPhone). On Windows the file downloads to your Downloads folder.
3. The file is named like `spendwise-backup-2026-11-03-2130.json` and contains all transactions, categories, budgets and settings, plus a schema version and timestamp.

The backup is created entirely inside your browser. Nothing is uploaded.

**Restore:**

1. Settings → **Restore from JSON backup** → choose the file.
2. SpendWise validates the whole file and shows a preview: new records, identical records, possible duplicates and conflicts. **Nothing is written yet.**
3. Choose:
   - **Merge** — adds new records, skips identical ones, keeps your existing data. For records edited differently on each side you choose which version wins. Possible duplicates (same date, amount, category, description but a different ID) are skipped unless you tick the box.
   - **Replace everything** — deletes all data on this device and restores the backup exactly. Requires typing `REPLACE`.
4. Confirm. The write happens in a single database transaction: it either fully succeeds or changes nothing.

Importing the same backup twice does not create duplicates.

**Move data between iPhone and laptop:** export on one device, transfer the file (AirDrop, email to yourself, iCloud Drive), and restore with **Merge** on the other.

**CSV export** (Settings → Export CSV, or the CSV button on Reports) produces a spreadsheet-friendly file with Date, Type, Description, Category, Recipient, Payment method, Amount (INR), Notes. Values that could be interpreted as spreadsheet formulas are neutralised. CSV is for analysis; use JSON for backups.

## 13. How local storage works

- Transactions, categories, budgets and settings are stored in **IndexedDB** in your browser, under the site's origin.
- The hosting service (GitHub Pages / Cloudflare) only serves the app files. It never sees your records; SpendWise makes no network requests with your data and contains no analytics.
- Each browser on each device has its **own separate database**. Your iPhone app and your Windows laptop do **not** sync automatically.
- Your data can be lost if you:
  - delete the Home Screen app,
  - clear Safari "Website Data" / browser site data,
  - or the browser evicts storage when the device is low on space.
- SpendWise asks the browser for **persistent storage** (Settings shows whether it was granted). This reduces the chance of eviction but **cannot guarantee** it. Home Screen apps on iOS are treated more favourably than Safari tabs.
- **Backups are the only reliable protection.**
- Changing the deployment URL (e.g. renaming the GitHub repo or moving hosts) creates a **new, empty** origin. Back up first, then restore on the new URL.

## 14. Updating the app safely

1. **Back up first** (Settings → Back up now). Always a good habit.
2. Make your changes, run `npm run check`, commit and push. The workflow redeploys.
3. Next time you open SpendWise online, it downloads the new version in the background and shows **"A new version of SpendWise is ready"**. Tap **Update**.
4. Updates only replace cached app files. Your IndexedDB data is not touched. If a new version changes the database structure, Dexie runs a versioned migration that upgrades your existing records in place (see `src/db/schema.ts`).

Rules for future database changes (for developers):
- Never edit an existing `this.version(n)` block. Add `this.version(n + 1)` with an `upgrade()` function.
- If the backup format changes, bump `BACKUP_SCHEMA_VERSION` and add a migration in `src/services/backup.ts` so old backups still restore.
- Do not change the hosting URL unless you back up and restore.

---

## Features

- **Overview** — month selector; "Spent on yourself" headline with a bar showing where outgoing money went (personal spending vs transfers vs savings vs investments); income/transfers/savings/investments/transaction count cards; budgets; category donut with top category; daily and weekly trends; payment-method breakdown; largest expenses; recent transactions. Tapping cards or categories opens the filtered transaction list.
- **Quick Add** — large amount field with decimal keypad, category icon tiles, payment method, Today/Yesterday/pick date, optional description and notes. Shortcuts for **Add expense**, **Add income** and **Transfer to Father** (pre-selects Transfer + Father; just enter amount, date and method).
- **Transactions** — search (description, merchant, recipient, notes, category), filter by type, category, payment method and date range, four sort orders, date-grouped list with daily spend, detail view, edit, delete with Undo.
- **Reports** — this month, last month, any year, custom range: per-type summary with like-for-like previous-period comparison, category and payment-method breakdowns, daily/weekly/monthly trends, highest expense, average daily spend, income/transfer/savings/investment summaries, CSV export.
- **Budgets** — optional, off by default, never derived from salary. Monthly overall limit and per-category limits with spent / remaining / % used.
- **Settings** — date format (DD/MM/YYYY or YYYY-MM-DD), theme (dark/light/system), category and recipient management with safe reassignment, backup, restore, CSV export, clear all data, storage status and explanations.
- **PWA** — installable, standalone, offline after first load, safe-area aware, update prompt.

## Project structure

```
src/
  components/
    ui/            Buttons, inputs, sheet (Radix Dialog), confirm dialog, toasts, icons
    layout/        App shell (sidebar + bottom nav), headers, update prompt, error boundary
    dashboard/     Overview hero, summary cards, budget progress
    transactions/  Quick Add sheet, rows, details, filters
    charts/        Recharts trend chart, category donut, payment bars
    reports/       Comparison table, type summaries
    settings/      Settings rows, import/restore flow
  pages/           Overview, Transactions, Reports, Settings, Categories, Budgets
  db/              Dexie schema + migrations, default category labels (no financial data)
  repositories/    The only code that reads/writes IndexedDB
  services/        calculations, reports, filters, backup/restore, CSV
  hooks/           Live-query data hooks, today (IST), theme, online status
  lib/             money, dates, validation (Zod), storage helpers, utils
  test/            Test setup and test-only factories
public/icons/      App icons (generated by `npm run icons` from scripts/generate-icons.mjs)
.github/workflows/ GitHub Pages deployment
```

## Money and calculation rules

- Amounts are stored as positive **integer paise** (`₹1,250.50` → `125050`). User input is parsed digit by digit; no floating-point arithmetic is used for money.
- All totals come from `src/services/calculations.ts`, used by every screen:
  - Personal expenses = sum of `type === 'expense'`
  - Transfers, income, savings, investments = each summed separately
  - Each transaction contributes to exactly one bucket; repeated IDs are never double-counted.
- Dates are stored as `YYYY-MM-DD` calendar dates in **Asia/Kolkata**. "Today" is always computed in IST.
- Comparisons are like-for-like: while a month is in progress, 1–N of this month is compared with 1–N of last month.
- Days before your first record are shown as **no data**, not ₹0. A tracked day with nothing spent is a genuine ₹0.

## Tech stack

React 18, TypeScript (strict), Vite 5, Tailwind CSS 3, shadcn/ui-style components on Radix Dialog, Lucide icons, Dexie 4 (IndexedDB), React Router 6 (hash routing), Recharts, date-fns, Zod, vite-plugin-pwa (Workbox), Vitest + fake-indexeddb, ESLint 9. Font: Manrope (bundled locally, no external requests).

## Troubleshooting

- **Blank page or "SpendWise could not start" after deploying** — the host is serving the source code instead of the built app.
  - GitHub Pages: Settings → Pages → Source must be **GitHub Actions**, and the latest run under the **Actions** tab must be green. A red run means nothing new was published; open it to see which step failed.
  - Other hosts: the build command must be `npm run build` and the published folder must be `dist`. If uploading by hand, upload what is *inside* `dist/`.
  - Check in a desktop browser: open the site, press F12 → Console/Network. Red 404s for `src/main.tsx` mean source code is being served; 404s for `assets/...` mean files are missing from the upload.
- **"Add to Home Screen" missing** — you must use Safari, and the site must be HTTPS.
- **Data missing in the installed app** — data entered in a Safari tab is separate from the Home Screen app. Export a backup from the tab, restore it in the app.
- **"SpendWise can't open its storage"** — private browsing or full storage. Use a normal window or free up space.
- **Update not showing** — close the app fully and reopen it while online; the update prompt appears when the new version has downloaded.
- **`npm install` fails on Windows** — make sure you opened a new terminal after installing Node, and that the folder path has no special characters.
