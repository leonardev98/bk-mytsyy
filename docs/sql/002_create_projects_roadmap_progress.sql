-- Proyectos, roadmaps (4 semanas) y progreso diario.
-- Ejecutar después de 001_create_users.sql. Base: mytsyy. TypeORM synchronize: false.

-- Proyectos: uno por "planteamiento" (chat: eligió propuesta | documento: subió PDF/Word/TXT).
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  source      VARCHAR(20) NOT NULL DEFAULT 'chat',  -- 'chat' | 'document'
  pitch       VARCHAR(500),
  why_it_wins TEXT,
  intro_message VARCHAR(1000),
  status      VARCHAR(20) NOT NULL DEFAULT 'active', -- draft | active | paused | completed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (user_id, updated_at DESC);

-- Un roadmap por proyecto (4 semanas, primeros 30 días).
CREATE TABLE IF NOT EXISTS roadmaps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_project_id ON roadmaps (project_id);

-- Semanas del roadmap: goals y actions por semana (1–4).
CREATE TABLE IF NOT EXISTS roadmap_weeks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  UUID NOT NULL REFERENCES roadmaps (id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
  goals       JSONB NOT NULL DEFAULT '[]',   -- ["objetivo 1", "objetivo 2"]
  actions     JSONB NOT NULL DEFAULT '[]',  -- ["acción 1", "acción 2"]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (roadmap_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_weeks_roadmap_id ON roadmap_weeks (roadmap_id);

-- Entradas de progreso (diario o cuando el usuario registra avance).
CREATE TABLE IF NOT EXISTS progress_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  entry_date       DATE NOT NULL,
  content          TEXT,
  progress_percent SMALLINT CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100)),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_entries_project_id ON progress_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_progress_entries_entry_date ON progress_entries (project_id, entry_date DESC);
