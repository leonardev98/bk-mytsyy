-- Añade la columna para la imagen de portada del proyecto.
-- Ejecutar después de 002_create_projects_roadmap_progress.sql. Base: mytsyy.

-- Referencia a la imagen de portada: URL pública o path interno según cómo sirva el backend el archivo.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN projects.image_url IS 'URL o path de la imagen de portada del proyecto; NULL si no tiene.';
