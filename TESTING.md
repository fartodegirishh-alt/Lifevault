# LifeVault — Quality Assurance & Test Verification

This document contains the manual verification test cases for the LifeVault Personal Document and Warranty Reminder Portal. Automated backend integration and unit tests are executable via `npm test`.

## Automated Backend Test Suite Summary

- **Total Automated Tests**: 27 passing tests (2 test suites)
- **Framework**: Jest + Supertest
- **Suites**:
  - `server/tests/api.test.js`: Health checks, User registration, Duplicate email rejection, User login, Invalid password rejection, JWT verification, Record CRUD, Date relationship validation, User ownership and authorization security checks (403 forbidden), File type rejection (400 on `.txt`), File size limits (5 MB max), Authenticated file downloads.
  - `server/tests/expiry.test.js`: Expiry edge cases (expired yesterday `-1d`, today `0d`, exactly 30 days, 31 days `Active`, missing/null date `No expiry date`, invalid date string, auto-calculation of warranty end dates).

---

## Manual Test Cases

| Test Case ID | Test Case Title & Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **TC01** | **Open home page**<br>1. Navigate to `/`.<br>2. Sign in with demo account (`demo@lifevault.test` / `Demo@1234`) or custom account.<br>3. Verify tagline and overview cards. | Tagline *"Keep important documents close, and every expiry date in sight."* appears. Live counts for Active, Expiring soon, Expired, and No expiry date display live database numbers. | To be tested |
| **TC02** | **Open All Records**<br>1. Click "All Records" in header navigation.<br>2. Inspect records grid. | Displays document and warranty record cards loaded from SQLite with status badges, categories, and file attachment badges. | To be tested |
| **TC03** | **Search known keyword**<br>1. In search input, type "Passport" or "MacBook" and hit Enter.<br>2. Observe filtered results. | Only matching records appear. Filter runs through `/api/records?search=...`. API Activity Inspector logs HTTP 200 with latency. | To be tested |
| **TC04** | **Search unmatched term**<br>1. Search for a fictional string like "xyznonexistent999".<br>2. Observe empty state. | "No records match your search" empty state appears with a "Clear all filters" button. | To be tested |
| **TC05** | **Filter by category**<br>1. Click category chips (e.g. "Identity", "Vehicle", "Warranty").<br>2. Inspect cards. | Records update dynamically to only show items belonging to the selected category. URL search param updates to `?category=...`. | To be tested |
| **TC06** | **Submit empty form**<br>1. Navigate to `/add-document` or `/add-warranty`.<br>2. Clear all fields and click "Save record". | Form submission is prevented with explicit validation errors highlighting required fields (e.g. "Document title is required" / "Purchase date is required"). | To be tested |
| **TC07** | **Submit valid record (persists after refresh)**<br>1. Fill valid title, category, issue and future expiry date.<br>2. Click "Save record".<br>3. Refresh the browser page. | A toast appears: "Record saved to database (ID X)". The record is written to SQLite and remains fully intact and visible after a hard page refresh. | To be tested |
| **TC08** | **Open record details**<br>1. Click any record card from Home or All Records.<br>2. Verify `/records/:id` page. | All metadata fields render: title, type, category, status badge, days left, dates, receipt location, notes, creation/update timestamps. | To be tested |
| **TC09** | **Expiry status matches date**<br>1. Compare record date with the status badge.<br>2. Check past date -> "Expired", within 30d -> "Expiring soon", >30d -> "Active", no date -> "No expiry date". | Expiry status badge and days counter strictly match the date difference according to the shared calculation logic. | To be tested |
| **TC10** | **Mobile width layout**<br>1. Resize viewport to ~375px.<br>2. Inspect hamburger menu, stacked cards, full-width buttons. | UI smoothly reflows without horizontal scrollbars. Touch targets and hamburger navigation work responsively. | To be tested |
| **TC11** | **Public deployment check**<br>1. Verify running on port 3000 in AI Studio / Cloud Run.<br>2. Ensure relative API base URL works without hardcoded localhost. | Frontend and backend connect seamlessly across external Cloud Run domains. | To be tested |
| **TC12** | **No secrets in repo**<br>1. Check `.gitignore`, `.env.example`, and repo tree.<br>2. Verify no JWT secrets or SQLite database files are checked in. | `.gitignore` excludes `.env*`, `node_modules`, `uploads/`, `*.db`. Example files contain placeholders only. | To be tested |
| **TC13** | **Missing/invalid date handling**<br>1. Enter an expiry date earlier than the issue date (or warranty end earlier than purchase date).<br>2. Submit form. | Server and client reject with HTTP 400: "Expiry date cannot be earlier than the issue date". Invalid date strings are rejected. | To be tested |
| **TC14** | **Reminder notification (in-app works; email only if SMTP configured)**<br>1. Navigate to `/upcoming`.<br>2. Click "Run Reminder Scan Now".<br>3. Check notifications and System Status page. | In-app notification cards are created without duplicates. System Status indicates "Email reminders not configured" (or SMTP active if configured). | To be tested |
| **TC15** | **Stop server and confirm "Disconnected" pill & banner appear**<br>1. Terminate backend server process.<br>2. Observe header connection pill and top alert banner. | Pill switches to rose: "Backend: Disconnected". Banner warns: *"Cannot reach server. Your changes are not saved."* No silent fallback to fake data. | To be tested |
| **TC16** | **Restart server and confirm it reconnects**<br>1. Restart the server.<br>2. Click "Retry Connection" on banner or wait 10 seconds. | Connection pill switches back to mint: "Backend: Connected (XX ms)". Disconnection banner disappears. | To be tested |
| **TC17** | **Access another user's record or file (denied)**<br>1. Register a new user (User B).<br>2. Attempt to open `/records/1` (User A's record) or `/api/records/1/file`. | Server returns HTTP 403 Forbidden: "Access denied. You do not have permission to access this record." File download is blocked. | To be tested |
