-- Añadir username a users para perfil público (/profile/:username).
-- Ejecutar después de 001_create_users.sql. Base: mytsyy. TypeORM synchronize: false.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)
  WHERE username IS NOT NULL;

COMMENT ON COLUMN users.username IS 'Slug único para URL de perfil (ej. eduardo-bohorquez).';
