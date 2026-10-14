# 🏛️ CivicConnect - Municipal Grievance & Automated SLA Escalation System

A modern, mobile-first Progressive Web App (PWA) and RESTful API platform enabling citizens to report civic issues (potholes, water pipeline bursts, garbage dumps, open manholes, broken streetlights) with photos and GPS geotagging. Municipal authorities are bound by strict department-level Service Level Agreements (SLAs), driven by an automated 3-tier escalation engine with citizen verification, satisfaction ratings, and executive analytics.

---

## 🌟 Key Features

### 👤 1. Citizen Experience
- **Mobile-First PWA**: Installable on iOS/Android/Desktop with offline app-shell caching via Service Worker.
- **Camera & Photo Evidence**: Capture/upload up to 3 evidence photos with automatic client-side preview and validation.
- **Precise Geotagging**: 1-click **Auto-Detect GPS** button + interactive draggable pin on OpenStreetMap with reverse-geocoded street addresses.
- **50-Meter Spatial Duplicate Alert**: Automatically calculates great-circle distance using the Haversine formula. If an identical issue was reported nearby, citizens can 1-click upvote ("Me Too") to boost priority instead of duplicating municipal tickets.
- **Live SLA Countdown Timer**: Real-time progress bar and countdown badge transitioning dynamically:
  - 🟢 **Green** ($<75\%$ elapsed)
  - 🟡 **Yellow** ($75\%-99\%$ elapsed)
  - 🔴 **Pulsing Red** ($100\%$ breach / critical overdue)
- **72-Hour Resolution Review Window**:
  - Inspect side-by-side **Before vs. After** photographic proof.
  - **Confirm Resolution**: Closes ticket with mandatory 1–5 star rating and satisfaction comments.
  - **Reopen Grievance**: Rejects inadequate work within 72 hours, automatically elevating ticket priority and dispatching urgent alerts to Department Heads.
- **Multilingual Support**: Instant 1-click switching between **English**, **हिंदी (Hindi)**, and **मराठी (Marathi)**.

### 👷 2. Authority Officer Portal
- **Department Queue & Auto-Routing**: Grievances automatically route to the corresponding department (Water, Roads, Sanitation, Electrical, Administration) and round-robin assign to active officers.
- **SLA Urgency Sorting**: Ranked queue highlighting nearing breaches and critical overdue tickets.
- **Field Status Workflow**: Single-action state transitions (`Acknowledged` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`).
- **Mandatory Resolution Proof**: Strict system enforcement preventing tickets from being marked `Resolved` without an uploaded "After" photo.

### 🏛️ 3. Municipal Administration & Command Center
- **Executive KPI Dashboard**:
  - **SLA Compliance Rate (%)**: Punctual resolution velocity across all divisions.
  - **Average Resolution Time (ART)**: Intake-to-resolution duration in hours.
  - **Caseload Distribution**: Breakdown by department and defect category.
- **Officer Performance Leaderboard**: Ranked by completed volume, SLA punctuality rate, and citizen star ratings.
- **Automated Escalation Engine (APScheduler)**:
  - **Level 1 (75% SLA)**: Reminder alert to assigned officer.
  - **Level 2 (100% SLA)**: Breach alert to Department Head & Citizen.
  - **Level 3 (200% SLA)**: Critical overdue alert to Municipal Commissioner.
  - **72h Auto-Closure**: Automatically finalizes unreviewed resolved tickets into `Closed`.
- **1-Click Data Exports**:
  - **CSV Report**: RFC 4180 export with complete issue lifecycle telemetry.
  - **PDF Audit Report**: Formatted municipal executive report generated via ReportLab.

### 🤖 4. AI Smart Triage & Municipal Spatial Heatmap (Phase 8)
- **AI Smart Triage**: Real-time heuristic evaluation analyzes reported titles and descriptions, proactively predicting category, binding SLA deadline, and severity with a 1-click apply chip.
- **Municipal Density Heatmap**: Dynamic spatial heatmap layer on the interactive Leaflet map rendering concentration hotspots with glowing color-coded density circles ($0\%-100\%$).
- **Dual-Channel Citizen & Officer Notifications**: Integrated SMTP email delivery alongside SMS dispatch stubs providing real-time alerts on ticket escalation and resolution.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet, PWA Service Worker |
| **Backend** | Python 3.11, Flask RESTful API, Flask-CORS, PyJWT, Werkzeug |
| **Database** | SQLite (Dev) with SQLAlchemy ORM (PostgreSQL-ready with psycopg2) |
| **Scheduler** | APScheduler (Advanced Python Scheduler) background cron service |
| **Maps & GIS** | Leaflet + OpenStreetMap (No paid API keys required) |
| **Document Export**| ReportLab (PDF generator) & Python standard CSV |
| **Containers** | Docker & Docker Compose (Multi-stage Node + Nginx & Python) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Start the Backend API
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python seed.py       # Populates sample municipal data
python app.py        # Starts server on http://127.0.0.1:5000
```

### 2. Start the Frontend PWA
```powershell
cd frontend
npm install
npm run dev          # Starts Vite dev server on http://localhost:3000
```

---

## 🐳 Running with Docker Compose

Deploy the entire production stack (Frontend + Backend + Volume persistence) in a single command:

```bash
docker-compose up --build
```
- Web Application: `http://localhost:3000`
- API Health Endpoint: `http://localhost:5000/api/health`

---

## 🔐 Default Demo Accounts

| Persona | Email | Password | Role / Access |
| :--- | :--- | :--- | :--- |
| **Municipal Admin** | `admin@civicconnect.org` | `AdminPassword123!` | Full administrative analytics, SLA rules, CSV/PDF export |
| **Roads Officer** | `officer.roads@civicconnect.org` | `OfficerPassword123!` | Potholes & road damage dispatch queue |
| **Water Officer** | `officer.water@civicconnect.org` | `OfficerPassword123!` | Water pipeline & open manhole dispatch queue |
| **Sanitation Officer** | `officer.sanitation@civicconnect.org` | `OfficerPassword123!` | Waste dump & garbage cleanup dispatch queue |
| **Citizen** | `citizen@example.com` | `CitizenPassword123!` | Public reporting, upvoting, review & reopen rights |

---

## 🧪 Automated Test Suites

All functional requirements are verified through automated end-to-end test suites:

```powershell
cd backend
.\venv\Scripts\python.exe test_phase1.py   # Auth, Reporting, Photos & Feed
.\venv\Scripts\python.exe test_phase2.py   # Departments, Auto-Assignment & Queue
.\venv\Scripts\python.exe test_phase3.py   # SLA Timers, 3-Tier Escalations & Notifications
.\venv\Scripts\python.exe test_phase4.py   # Mandatory Proof, 72h Review, Feedback & Auto-Close
.\venv\Scripts\python.exe test_phase5.py   # Spatial Duplicates, Upvotes & Comments
.\venv\Scripts\python.exe test_phase6.py   # Analytics, Leaderboard & CSV Export
.\venv\Scripts\python.exe test_phase7_packaging.py # PDF Export & Production Health Check
.\venv\Scripts\python.exe test_phase8.py   # AI Smart Triage, SMS Stubs & Spatial Heatmap
```

---

## 📜 API Reference Highlights

- `POST /api/auth/register` - Citizen account registration
- `POST /api/auth/login` - Persona authentication & JWT issuance
- `GET /api/issues` - Paginated public grievance feed with search & sorting
- `POST /api/issues` - File multipart grievance submission with GPS & photos
- `GET /api/issues/duplicates` - 50m spatial duplicate detection via Haversine calculation
- `POST /api/issues/<id>/upvote` - Toggle citizen upvote ("Me Too") and boost priority score
- `GET /api/issues/<id>` - Full grievance details with timeline logs and comments
- `POST /api/issues/<id>/comments` - Add public comment or official authority dispatch update
- `PATCH /api/issues/<id>/status` - Officer status update with mandatory resolution photo validation
- `POST /api/issues/<id>/confirm` - Citizen resolution confirmation with 1–5 star rating
- `POST /api/issues/<id>/reopen` - Citizen grievance reopen within 72-hour review window
- `GET /api/analytics/summary` - Municipal SLA compliance rate and average resolution time (ART)
- `GET /api/analytics/leaderboard` - Officer resolution velocity and citizen satisfaction ranking
- `GET /api/analytics/heatmap` - Spatial density coordinates with intensity metrics
- `GET /api/analytics/export/csv` - Stream RFC 4180 CSV report
- `GET /api/analytics/export/pdf` - Stream ReportLab-generated Executive PDF audit report

