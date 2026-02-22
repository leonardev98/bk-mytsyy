-- Feed de publicaciones y reacciones.
-- Ejecutar después de 001_create_users.sql. Base: mytsyy. TypeORM synchronize: false.

-- Publicaciones del feed (audiencia: public | builders | only_me).
CREATE TABLE IF NOT EXISTS feed_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text             VARCHAR(2000) NOT NULL,
  audience         VARCHAR(20) NOT NULL DEFAULT 'public',  -- 'public' | 'builders' | 'only_me'
  current_day      SMALLINT NOT NULL DEFAULT 0,
  total_days       SMALLINT NOT NULL DEFAULT 30,
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  evidence_image_url VARCHAR(500),
  evidence_link    VARCHAR(500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts (created_at DESC);

-- Reacciones (like) por publicación y usuario (una por usuario por post).
CREATE TABLE IF NOT EXISTS feed_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_post_id ON feed_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user_id ON feed_reactions (user_id);
