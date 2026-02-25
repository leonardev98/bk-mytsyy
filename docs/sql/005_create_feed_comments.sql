-- Comentarios del feed (primer nivel o respuestas con parent_id).
-- Ejecutar después de 004_create_feed_posts.sql. Base: mytsyy. TypeORM synchronize: false.

CREATE TABLE IF NOT EXISTS feed_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES feed_comments (id) ON DELETE CASCADE,
  text       VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_post_id ON feed_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_parent_id ON feed_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_created_at ON feed_comments (post_id, created_at ASC);
