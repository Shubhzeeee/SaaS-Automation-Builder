# FlowForge — SaaS Automation Builder

> An industry-grade, production-ready workflow automation platform — think Zapier or Make.com, built from scratch.

![FlowForge](https://img.shields.io/badge/FlowForge-1.0.0-7c3aed?style=for-the-badge)
![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?style=flat-square&logo=nestjs)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square&logo=postgresql)

---

## 🏗 Architecture

```
saas-automation-builder/
├── backend/                  # NestJS API (Node.js)
│   └── src/
│       ├── auth/             # JWT auth, OAuth, sessions
│       ├── users/            # User & org management
│       ├── workflows/        # Workflow CRUD + BFS execution engine
│       ├── integrations/     # 10-provider catalog (Slack, GitHub, etc.)
│       ├── analytics/        # Dashboard stats, time-series, audit log
│       ├── billing/          # Stripe subscriptions & webhooks
│       ├── queues/           # Bull queue for async executions
│       └── common/           # Guards, interceptors, filters, decorators
├── frontend/                 # Next.js 14 App Router
│   └── src/
│       ├── app/              # Pages (dashboard, auth)
│       │   ├── dashboard/    # Main app (workflows, integrations, analytics…)
│       │   └── auth/         # Login, register, forgot-password
│       ├── components/       # Reusable UI components
│       ├── hooks/            # React Query data hooks
│       ├── store/            # Zustand auth store
│       └── lib/              # API client, utils
├── database/
│   └── init.sql              # Full PostgreSQL schema (15 tables)
├── docker-compose.yml        # Full local stack
└── .github/workflows/ci.yml  # CI/CD pipeline
```

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **API** | NestJS 10, TypeScript 5, Fastify-compatible |
| **Frontend** | Next.js 14 App Router, React 18, Tailwind CSS |
| **Database** | PostgreSQL 16 with raw SQL (pg pool) |
| **Cache** | Redis 7 (sessions, queues) |
| **Queue** | Bull + Redis (async workflow execution) |
| **Auth** | JWT access tokens + refresh token rotation |
| **Payments** | Stripe Checkout + Customer Portal + Webhooks |
| **Workflow Engine** | BFS graph traversal over node definitions |
| **State** | Zustand (client), React Query (server) |
| **Drag & Drop** | React Flow (workflow canvas) |
| **Charts** | Recharts (analytics dashboard) |
| **CI/CD** | GitHub Actions → Docker → SSH deploy |

## 🎨 Features

### Workflow Engine
- **Visual canvas** — drag-and-drop nodes powered by React Flow
- **8 node types** — Trigger, HTTP Request, Condition (branching), Delay, Transform, Email, Code, Filter
- **BFS execution** — topological graph traversal with full context passing
- **Version history** — every save creates an immutable version snapshot
- **Inbound webhooks** — HMAC-verified triggers from external services
- **Manual execution** — test workflows instantly from the UI

### Integrations
- 10-provider catalog out of the box: Slack, GitHub, Gmail, Notion, Stripe, OpenAI, Google Sheets, Airtable, PostgreSQL, HTTP/REST
- Connection testing with live credential validation
- Secure credential storage (encrypted at application layer)

### Analytics & Observability
- Real-time dashboard with execution charts (7d/30d/90d)
- Per-workflow success rates and run counts
- Full audit log for compliance
- Step-level execution tracing

### Billing (Stripe)
- Free / Starter ($29/mo) / Pro ($99/mo) / Enterprise plans
- Stripe Checkout + Customer Portal integration
- Usage metering with plan limit enforcement
- Webhook-based subscription sync

### Auth & Security
- JWT access tokens (7d) + refresh token rotation (30d)
- Bcrypt password hashing (cost factor 12)
- Helmet, CORS, global rate limiting (100 req/min)
- OAuth2 ready (Google, GitHub)
- MFA scaffold (TOTP)

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js ≥ 20
- Docker & Docker Compose

### 2. Clone & configure

```bash
git clone https://github.com/yourname/saas-automation-builder.git
cd saas-automation-builder
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET (32+ chars)
```

### 3. Start infrastructure

```bash
docker compose up -d postgres redis rabbitmq
```

### 4. Install & run

```bash
npm install
npm run dev
```

- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:3001
- **Swagger docs** → http://localhost:3001/api/docs
- **RabbitMQ UI** → http://localhost:15672 (flowforge / rabbitmq_dev)

### 5. Full Docker stack

```bash
docker compose up --build
```

---

## 🧪 Testing

```bash
# Unit tests (backend)
npm run test --workspace=backend

# E2E tests (backend)
npm run test:e2e --workspace=backend

# Frontend tests
npm run test --workspace=frontend

# Coverage
npm run test:coverage --workspace=backend
```

---

## 📡 API Overview

All endpoints are prefixed `/api/v1/`. Full Swagger docs at `/api/docs`.

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` |
| **Workflows** | Full CRUD + `/execute`, `/duplicate`, `/versions`, `/executions` |
| **Integrations** | `GET /integrations/catalog`, CRUD + `/test` |
| **Analytics** | `GET /analytics/dashboard`, `/timeseries`, `/audit` |
| **Billing** | `GET /billing/subscription`, `POST /billing/checkout`, `/billing/portal`, `/billing/webhooks/stripe` |
| **Users** | `GET /users/profile`, `PATCH /users/profile`, `GET /users/org/members` |
| **Webhooks** | `POST /webhooks/:endpointId` (public, HMAC-verified) |
| **Health** | `GET /health` |

---

## 🚢 Deployment

### Environment variables for production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<32+ char random string>
STRIPE_KEY=sk_live_...
FRONTEND_URL=https://app.yoursite.com
```

### Docker production build

```bash
docker compose -f docker-compose.yml build
docker compose up -d
```

### CI/CD (GitHub Actions)
The `.github/workflows/ci.yml` pipeline:
1. Lints both workspaces in parallel
2. Runs unit + integration tests with live PostgreSQL + Redis
3. Builds and pushes Docker images to GHCR on `main` push
4. SSH-deploys to production server

---

## 🗂 Database Schema

15 tables with full relational integrity:

`organizations` → `users` → `oauth_identities`, `refresh_tokens`  
`subscriptions` (Stripe sync) · `integrations` · `api_keys` · `invitations`  
`workflows` → `workflow_versions` · `webhook_endpoints`  
`workflow_executions` → `execution_steps`  
`audit_logs` · `usage_metrics`

---

## 📝 License

MIT © FlowForge Team
