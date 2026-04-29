# 🏙️ CivicPulse — Smart Civic Issue Reporting Platform

> A production-grade municipal complaint management system with AI validation, real-time updates, GPS-based ward routing, and intelligent deduplication — built for Smart India Hackathon.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20PostGIS-blue)](https://postgis.net)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue)](https://flutter.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-green)](https://fastapi.tiangolo.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-black)](https://socket.io)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io)

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [AI Validation Pipeline](#-ai-validation-pipeline)
- [Deduplication System](#-deduplication-system)
- [OTP Authentication](#-otp-authentication)
- [Real-time Updates](#-real-time-updates)
- [Priority Algorithm](#-priority-algorithm)
- [Database Schema](#-database-schema)

---

## 🚨 Problem Statement

Municipal corporations across India receive thousands of civic complaints daily through fragmented, inefficient channels. The core problems are:

- **Duplicate overload** — The same pothole gets reported 50+ times, burying real issues under noise
- **No verification** — Anyone can submit fake or exaggerated complaints, wasting officer resources
- **Manual routing** — Officers spend hours manually identifying which department and ward a complaint belongs to
- **No accountability** — Complaints are filed but never tracked, resolved, or communicated back to citizens
- **Zero transparency** — Citizens have no visibility into whether their complaint was received, validated, or acted upon
- **SLA failures** — No automated escalation when deadlines are missed

**Existing solutions** like BBMP Sahaaya, MyGov, and Janaagraha suffer from the same fundamental flaw — they are digital suggestion boxes with no intelligence, no real-time capability, and no operational backend for officers.

---

## 💡 Solution Overview

CivicPulse is a full-stack smart complaint management platform that bridges the gap between citizens and municipal corporations through five core innovations:

| Innovation | What it does |
|---|---|
| **AI Photo Validation** | MobileNetV3 model validates every complaint photo before it reaches officers |
| **Dual-layer Deduplication** | GPS geohash + TF-IDF text similarity merges redundant complaints automatically |
| **PostGIS Ward Routing** | Spatial polygon matching routes every complaint to the correct ward officer instantly |
| **Real-time Dashboard** | Socket.io pushes new complaints and SLA alerts to officers instantly |
| **Trust & Abuse Prevention** | OTP auth, rate limiting, and user trust scoring prevent spam |

---

## ✨ Key Features

### 🤖 AI-Powered Complaint Validation
- Every complaint photo analyzed by MobileNetV3 deep learning model
- Confidence scoring: ≥75% = validated, 50-74% = manual review, <50% = rejected
- GPS bounds verification — complaint must be within the city service area
- Runs asynchronously in background — never blocks citizen submission
- Trust score adjusted automatically based on AI result

### 🔍 Intelligent Deduplication
- **Layer 1 — GPS Geohash**: Redis-based spatial deduplication using 7-character geohash (~150m precision) with 72-hour TTL
- **Layer 2 — Text Similarity**: TF-IDF cosine similarity algorithm detects semantically similar complaints (>70% match = duplicate) within the same ward and category
- Merged duplicates automatically boost the original issue's priority score

### 📍 Automatic Ward Routing (PostGIS)
- Real coordinate-based polygon boundary matching
- Fallback to nearest ward within 10km for out-of-boundary complaints
- Sub-millisecond spatial queries using indexed PostGIS geometry columns
- Supports unlimited ward expansion via GeoJSON boundary upload

### ⚡ Real-time Officer Dashboard
- Socket.io bidirectional event streaming
- Instant alerts: new issue in ward, SLA breach, status change
- Live Bengaluru issue heatmap with category color coding
- Analytics tab: resolution times, category breakdown, ward performance

### 🔐 OTP Authentication
- 6-digit OTP with 5-minute Redis expiry
- 3-attempt retry limit with automatic lockout
- 60-second cooldown between resend requests
- Mock SMS logging (production-ready for Twilio/SendGrid integration)

### 📊 SLA Tracking & Escalation
- Category-specific SLA hours configured in database
- Cron job runs every 30 minutes to detect breached SLAs
- Automatic escalation notifications to senior officers
- Priority score boost for SLA-breached complaints

### 🛡 Abuse Prevention
- Redis-based rate limiting per user and IP
- User trust scoring (starts at 100, +5 for validated, -10 for rejected complaints)
- Geohash deduplication prevents location-based spam
- JWT with refresh token rotation

---

## 🛠 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Mobile App** | Flutter 3 + Riverpod | Cross-platform iOS/Android citizen app |
| **Officer Dashboard** | React 18 + Vite (PWA) | Fast, offline-capable officer web app |
| **Backend API** | Node.js 18 + Express | Non-blocking I/O for concurrent requests |
| **AI Microservice** | Python FastAPI + PyTorch | Isolated ML inference, never blocks main API |
| **ML Model** | MobileNetV3 (ImageNet) | Fast CPU inference, no GPU required |
| **Database** | PostgreSQL 16 + PostGIS | Spatial ward routing via polygon geometry |
| **Cache** | Redis 7 | Dedup store, OTP, rate limiting, sessions |
| **Real-time** | Socket.io | Bidirectional ward-room event streaming |
| **Maps** | React-Leaflet + OpenStreetMap | Free, no API key required |
| **Auth** | JWT + bcrypt + OTP | Stateless auth with refresh rotation |
| **Containerization** | Docker + Docker Compose | Reproducible local + cloud deployment |
| **Push Notifications** | Firebase Cloud Messaging | Citizen status update notifications |
| **Reverse Geocoding** | OpenStreetMap Nominatim | Free address lookup from GPS coordinates |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                │
│                                                                  │
│   Flutter Mobile App          React PWA Dashboard               │
│   (Citizen — report issues)   (Officer — manage complaints)     │
└──────────────┬────────────────────────────┬─────────────────────┘
               │ HTTPS REST API             │ REST + Socket.io
               ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Node.js Express Backend  :3000                   │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Auth Routes │  │ Issue Routes │  │ Ward Routes            │ │
│  │ /register   │  │ /submit      │  │ /wards                 │ │
│  │ /login      │  │ /mine        │  │ /wards/:id/stats       │ │
│  │ /send-otp   │  │ /analytics   │  └────────────────────────┘ │
│  │ /verify-otp │  │ /:id/status  │                             │
│  └─────────────┘  └──────────────┘                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Services Layer                        │   │
│  │  OTP Service  │  Dedup Service  │  Priority Engine      │   │
│  │  Auth Service │  Issues Service │  Socket Service       │   │
│  │  Notif Service│  Escalation Cron│  Validator Service    │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬──────────────────┬───────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────────────┐
│  PostgreSQL 16  │  │   Redis 7     │  │  Python FastAPI :8001 │
│  + PostGIS      │  │               │  │                       │
│                 │  │ • Dedup cache │  │  MobileNetV3 Model    │
│  • issues       │  │ • OTP store   │  │  /validate endpoint   │
│  • users        │  │ • Rate limits │  │  GPS bounds check     │
│  • wards        │  │ • Sessions    │  │  Confidence scoring   │
│  • sla_config   │  └───────────────┘  └──────────────────────┘
│  • status_hist  │
│  • votes        │
│  • refresh_tok  │
└─────────────────┘
```

---

## 📁 Project Structure

```
civicpulse/
│
├── backend/                              # Node.js Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                     # PostgreSQL + PostGIS connection pool
│   │   │   └── redis.js                  # Redis client configuration
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # Register, login, OTP send/verify
│   │   │   ├── issues.controller.js      # CRUD, analytics, status updates
│   │   │   └── wards.controller.js       # Ward listing and statistics
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT verification + role-based access
│   │   │   ├── upload.js                 # Multer photo upload handler
│   │   │   ├── validate.js               # Joi schema validation
│   │   │   └── errorHandler.js           # Global error handler
│   │   ├── models/
│   │   │   ├── issue.model.js            # Issue queries + geohash dedup count
│   │   │   ├── user.model.js             # User CRUD + trust score management
│   │   │   └── ward.model.js             # PostGIS spatial boundary queries
│   │   ├── routes/
│   │   │   ├── auth.routes.js            # POST /auth/*
│   │   │   ├── issues.routes.js          # GET/POST/PATCH /issues/*
│   │   │   └── wards.routes.js           # GET /wards/*
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   └── validator.service.js  # HTTP caller to Python microservice
│   │   │   ├── auth.service.js           # JWT generation + bcrypt hashing
│   │   │   ├── dedup.service.js          # GPS + TF-IDF text similarity dedup
│   │   │   ├── escalation.service.js     # SLA breach detection logic
│   │   │   ├── issues.service.js         # Core business logic orchestration
│   │   │   ├── notification.service.js   # FCM push notification sender
│   │   │   ├── otp.service.js            # OTP generate, verify, cooldown
│   │   │   ├── priority.service.js       # Priority score calculation
│   │   │   └── socket.service.js         # Socket.io event emitters
│   │   ├── jobs/
│   │   │   └── escalation.job.js         # Cron: SLA breach check every 30min
│   │   ├── utils/
│   │   │   └── logger.js                 # Winston structured logger
│   │   └── server.js                     # App bootstrap + Socket.io init
│   ├── sql/
│   │   └── init.sql                      # Full DB schema + seed data
│   ├── .env                              # Environment configuration
│   └── package.json
│
├── validator/                            # Python AI Microservice
│   ├── main.py                           # FastAPI app + /validate + /health
│   ├── classifier.py                     # MobileNetV3 inference + GPS check
│   └── .env                             # CONFIDENCE_THRESHOLD=0.75
│
├── web-dashboard/                        # React PWA (Municipal Officer)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticsDashboard.jsx    # Analytics by category + ward
│   │   │   ├── IssueMap.jsx              # Leaflet heatmap with popups
│   │   │   ├── IssueTable.jsx            # Status action buttons
│   │   │   └── StatsCards.jsx            # KPI summary cards
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx             # Split citizen/officer login UI
│   │   │   ├── RegisterPage.jsx          # 2-step registration flow
│   │   │   ├── DashboardPage.jsx         # Officer main view + analytics tab
│   │   │   └── CitizenPortal.jsx         # Citizen report + my complaints
│   │   └── services/
│   │       ├── api.js                    # Axios client + auth interceptors
│   │       └── socket.js                 # Socket.io client + event handlers
│   └── package.json
│
├── civicpulse_app/                       # Flutter Mobile App (Citizen)
│   └── lib/
│       ├── screens/
│       │   ├── login_screen.dart         # Login with role selection
│       │   ├── register_screen.dart      # Citizen registration
│       │   ├── home_screen.dart          # My complaints + status timeline
│       │   └── report_screen.dart        # GPS lock + camera + submit flow
│       ├── services/
│       │   ├── api_service.dart          # HTTP client + token management
│       │   └── auth_service.dart         # Login/register/logout
│       └── providers/
│           ├── auth_provider.dart        # Auth state management
│           └── issues_provider.dart      # Issues state management
│
└── docker-compose.yml                    # PostgreSQL + Redis containers
```

---

## 🚀 Getting Started

### Prerequisites

- Docker Desktop (running)
- Node.js 18+
- Python 3.10+
- Flutter 3.x (for mobile app only)

### Step 1 — Start Infrastructure

```bash
cd civicpulse
docker compose up -d
docker ps
# Verify: civicpulse_postgres and civicpulse_redis are running
```

### Step 2 — Add Trust Score Column

```bash
docker exec -it civicpulse_postgres psql -U postgres -d civicpulse -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;"
```

### Step 3 — Start Backend API

```bash
cd backend
npm install
npm run dev
# Expected: [INFO] Server running → http://localhost:3000
```

### Step 4 — Start AI Microservice

```bash
cd validator
pip install fastapi uvicorn pillow python-dotenv torch torchvision --break-system-packages
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# Expected: Uvicorn running on http://0.0.0.0:8001
```

### Step 5 — Start Officer Dashboard

```bash
cd web-dashboard
npm install
npm run dev
# Expected: VITE ready → http://localhost:5173
```

### Environment Variables

```env
# backend/.env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civicpulse
DB_USER=postgres
DB_PASSWORD=postgres123
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=civicpulse_jwt_secret_change_in_prod
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=civicpulse_refresh_secret_change_in_prod
JWT_REFRESH_EXPIRES_IN=30d
VALIDATOR_URL=http://localhost:8001
```

---

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `{name, email, password, role, department?}` | Register citizen or officer |
| POST | `/api/v1/auth/login` | `{email, password}` | Login → returns JWT tokens |
| POST | `/api/v1/auth/send-otp` | `{email}` | Generate + send OTP |
| POST | `/api/v1/auth/verify-otp` | `{email, otp}` | Verify OTP → returns JWT tokens |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` | Rotate access token |
| POST | `/api/v1/auth/logout` | `{refreshToken}` | Revoke token |
| GET | `/api/v1/auth/me` | — | Get current user profile |

### Issues Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/issues` | Citizen | Submit complaint (multipart/form-data) |
| GET | `/api/v1/issues` | Officer | Get all issues with filters |
| GET | `/api/v1/issues/mine` | Citizen | Get my submitted issues |
| GET | `/api/v1/issues/analytics` | Officer | Summary + by category + by ward |
| GET | `/api/v1/issues/:id` | Any | Get single issue detail |
| PATCH | `/api/v1/issues/:id/status` | Officer | Update status + add note |
| POST | `/api/v1/issues/:id/vote` | Citizen | Upvote an issue |

### Ward Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/wards` | Any | List all wards |
| GET | `/api/v1/wards/:id/stats` | Officer | Ward-level issue statistics |

---

## 🤖 AI Validation Pipeline

### How It Works

```
Citizen submits complaint with photo
              ↓
Node.js backend saves issue (status: submitted)
              ↓
setImmediate() → async background call to Python
              ↓
FastAPI /validate receives: image + category + lat + lng
              ↓
┌─────────────────────────────────────┐
│  Step 1: Image integrity check      │
│  → Is the file a valid image?       │
│  → Is it at least 100x100 pixels?   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Step 2: GPS bounds validation      │
│  → Is lat/lng within city bounds?   │
│  → Bengaluru: 12.83-13.14°N        │
│               77.46-77.78°E         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Step 3: MobileNetV3 inference      │
│  → Load image as RGB tensor         │
│  → Resize to 224x224               │
│  → Normalize with ImageNet stats   │
│  → Run forward pass                │
│  → Extract top confidence score    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Step 4: Threshold decision         │
│  confidence ≥ 0.75 → validated     │
│  confidence ≥ 0.50 → manual_review │
│  confidence < 0.50 → rejected      │
└─────────────────────────────────────┘
              ↓
Node.js updates issue: ai_status + ai_confidence
              ↓
If validated → status changes to "validated"
User trust score adjusted (+5 or -10)
```

### Why MobileNetV3?

- **Fast**: CPU inference in ~200ms — no GPU needed
- **Lightweight**: 5.4M parameters — deployable on low-cost servers
- **Cost-effective**: No per-call API charges unlike GPT-4V or Gemini Vision
- **Private**: Images never leave the municipal server
- **Production path**: Fine-tune on labeled civic issue dataset for higher accuracy

### Test AI Service Directly

```bash
# Health check
curl http://localhost:8001/health

# Validate with image (Postman)
POST http://localhost:8001/validate
Content-Type: multipart/form-data
Fields:
  image    → [upload any image file]
  category → pothole
  lat      → 13.036240
  lng      → 77.597286
```

---

## 🔍 Deduplication System

### Layer 1 — GPS Geohash (Redis)

```
New complaint at GPS coordinates
          ↓
Encode to 7-char geohash (~150m cell)
          ↓
Key: dedup:{category}:{geohash}
          ↓
Redis GET → Found?
  YES → Duplicate! Increment original vote count
  NO  → Redis SET with 72-hour TTL → Proceed
```

### Layer 2 — TF-IDF Text Similarity

```python
# Cosine similarity between complaint texts
def cosineSimilarity(textA, textB):
    tokens_A = tokenize(textA)  # lowercase, remove punctuation
    tokens_B = tokenize(textB)
    # Build term frequency vectors
    # Calculate dot product / (|A| × |B|)
    return similarity_score  # 0.0 to 1.0

# If combined score > 0.70 → text duplicate
combined = (title_similarity × 0.6) + (description_similarity × 0.4)
```

---

## 🔐 OTP Authentication

```
POST /auth/send-otp  { email }
          ↓
Find user by email
          ↓
Check Redis cooldown key (60s between requests)
          ↓
Generate 6-digit random OTP
          ↓
Store in Redis: otp:{userId} → {otp, attempts:0} TTL: 5min
          ↓
Log to console (mock SMS — replace with Twilio)
          ↓
POST /auth/verify-otp  { email, otp }
          ↓
Get Redis record → check attempts < 3 → check match
          ↓
Valid → delete Redis key → issue JWT tokens
```

---

## ⚡ Real-time Updates

### Socket.io Events

| Event | Direction | Trigger |
|---|---|---|
| `join:ward` | Client → Server | Officer logs in |
| `issue:new` | Server → Client | New complaint submitted in ward |
| `issue:status` | Server → Client | Officer updates complaint status |
| `issue:sla_breach` | Server → Client | Cron detects SLA breach |

---

## 📊 Priority Algorithm

```
priority_score =
    base_priority (from sla_config table)
  + vote_count × 2
  + ward.risk_score × 10
  + days_since_created × 0.5
  + (sla_hours_remaining < 24 ? 20 : 0)
  + (sla_breached ? 30 : 0)
```

---

## 🗄 Database Schema

```sql
users (
  id UUID, name VARCHAR, email VARCHAR UNIQUE,
  password_hash VARCHAR, role VARCHAR,
  ward_id UUID, department VARCHAR,
  is_verified BOOLEAN, is_active BOOLEAN,
  trust_score INTEGER DEFAULT 100,
  fcm_token TEXT, last_login_at TIMESTAMPTZ
)

wards (
  id UUID, ward_number INTEGER UNIQUE,
  ward_name VARCHAR, city VARCHAR, zone VARCHAR,
  boundary GEOMETRY(Polygon, 4326),  -- PostGIS spatial type
  area_sqkm NUMERIC, population INTEGER, risk_score NUMERIC
)

issues (
  id UUID, reported_by UUID → users,
  latitude NUMERIC, longitude NUMERIC,
  location_point GEOMETRY(Point, 4326),
  address TEXT, ward_id UUID → wards,
  category VARCHAR, title VARCHAR, description TEXT,
  photo_url TEXT, geohash VARCHAR,
  status VARCHAR, ai_status VARCHAR, ai_confidence NUMERIC,
  priority_score NUMERIC, vote_count INTEGER,
  sla_deadline TIMESTAMPTZ, sla_breached BOOLEAN,
  is_duplicate BOOLEAN, resolved_at TIMESTAMPTZ
)

issue_status_history (
  id UUID, issue_id UUID → issues,
  changed_by UUID → users,
  from_status VARCHAR, to_status VARCHAR,
  note TEXT, created_at TIMESTAMPTZ
)

sla_config (category VARCHAR, sla_hours INTEGER, base_priority INTEGER)
refresh_tokens (user_id UUID, token TEXT, expires_at TIMESTAMPTZ)
votes (issue_id UUID, user_id UUID, UNIQUE)
```

---

## 🐳 Docker Configuration

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: civicpulse_postgres
    environment:
      POSTGRES_DB: civicpulse
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    container_name: civicpulse_redis
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 🔗 Health Check URLs

| Service | URL |
|---|---|
| Backend API | http://localhost:3000/api/v1/health |
| AI Validator | http://localhost:8001/health |
| Officer Dashboard | http://localhost:5173 |

---

*Built with ❤️ for India's citizens and municipal officers*
