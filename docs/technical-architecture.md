# Mytsyy Venture OS
## Technical Architecture Document

---

# 1. Architecture Overview

Frontend:
- Next.js (App Router)
- TypeScript
- TailwindCSS
- React Query or Server Actions

Backend:
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM (planned)
- pnpm

Architecture Style:
- Modular Monolith (MVP)
- No microservices initially

---

# 2. High-Level System Design

User
 ↓
Frontend (Next.js)
 ↓
Backend API (NestJS)
 ↓
Database (PostgreSQL)
 ↓
AI Orchestration Layer

---

# 3. Backend Modules (MVP Structure)

## 3.1 Auth Module
- User registration
- Login
- JWT
- Session validation

## 3.2 User Profile Module
- Store onboarding responses
- Store preferences
- Store execution data

## 3.3 Idea Engine Module
- Receives structured profile
- Calls AI service
- Returns scored ideas

## 3.4 Roadmap Engine Module
- Generates execution plan
- Breaks into structured steps

## 3.5 Task Module
- Store tasks
- Update status
- Calculate progress

## 3.6 Pivot Engine (Basic)
- Triggered manually or by metrics
- Generates alternative strategies

---

# 4. Database Core Tables (MVP)

**Implemented:**
- `users` — auth (ver 001_create_users.sql)
- `projects` — un proyecto por planteamiento (chat: eligió propuesta; document: subió PDF/Word/TXT). Campos: title, description, source, pitch, why_it_wins, status, user_id.
- `roadmaps` — un roadmap por proyecto (4 semanas).
- `roadmap_weeks` — semanas 1–4 con goals (JSONB) y actions (JSONB).
- `progress_entries` — entradas de progreso por proyecto (entry_date, content, progress_percent). Ver docs/sql/002_create_projects_roadmap_progress.sql.

**Future (MVP):**
- user_profiles (onboarding estructurado)
- tasks (desglose opcional de acciones en tareas con estado)
- validations (leads, ventas, feedback)

**Post-MVP:**
- providers, consultants, matches, transactions

---

# 5. AI Orchestration Strategy

The system will not use one large prompt.

Instead, it will separate logic into:

1. Profile Analyzer
2. Idea Generator
3. Idea Scoring
4. Roadmap Builder
5. Pivot Analyzer
6. Branding Generator (future)
7. Marketing Generator (future)

Each module can evolve independently.

---

# 6. Frontend Structure (App Router)

app/
  layout.tsx
  page.tsx
  onboarding/
  dashboard/
  project/
  tasks/

UI Principles:
- Clean
- Minimal
- Dark mode default
- Clear hierarchy
- No visual noise

---

# 7. Security

- JWT authentication
- Rate limiting (future)
- Input validation via DTOs
- Zod validation on frontend
- Environment variable protection

---

# 8. Deployment (Future)

- Frontend → Vercel
- Backend → Railway / Render / AWS
- DB → Managed PostgreSQL

---

# 9. Scalability Plan

Phase 1:
- Single region
- Single database

Phase 2:
- Analytics layer
- AI usage tracking
- Performance monitoring

Phase 3:
- Marketplace service isolation
- Multi-region support

---

# 10. Development Principles

- Do not over-engineer
- Build execution core first
- Marketplace later
- AI modules separated
- Code must remain modular

---

End of Architecture Document.
