# Backend — API y prompts

Documento de referencia para el equipo backend: estado de endpoints y enlaces a especificaciones detalladas.

---

## Tabla de estado de endpoints (proyectos)

| # | Método | Ruta | Descripción | Estado |
|---|--------|------|-------------|--------|
| 1 | POST | `/projects` | Crear proyecto (con roadmap) | — |
| 2 | GET | `/projects` | Listar mis proyectos | — |
| 3 | GET | `/projects/:id` | Ver un proyecto | — |
| 4 | POST | `/projects/:id/progress` | Añadir entrada de progreso | — |
| 5 | GET | `/projects/:id/progress` | Listar progreso del proyecto | — |
| 6 | PATCH | `/projects/:id/status` | Actualizar estado (draft/active/paused/completed) | — |
| 7 | PUT/PATCH | `/projects/:id/cover` | Subir o actualizar imagen de portada | Pendiente |
| 7b | DELETE | `/projects/:id/cover` | Quitar imagen de portada (opcional) | Pendiente |

**Nota:** En las respuestas de `GET /projects` y `GET /projects/:id` debe incluirse el campo **`imageUrl`** (portada del proyecto). Ver especificación completa en [BACKEND-PROJECT-COVER-IMAGE.md](./BACKEND-PROJECT-COVER-IMAGE.md).

---

## Especificación detallada: portada (cover image)

Para implementar o editar el servicio de portada de proyecto, usar la **sección 2** de:

**[BACKEND-PROJECT-COVER-IMAGE.md](./BACKEND-PROJECT-COVER-IMAGE.md)**

Esa sección está redactada como prompt listo para copiar y pegar (modelo, migración, `imageUrl` en GETs, endpoint de subida con opciones multipart/base64, seguridad y DELETE opcional).

---

## SQL y esquema

- Las tablas base de proyectos están definidas en `docs/sql/` (por ejemplo `002_create_projects_roadmap_progress.sql`).
- **Columna para la portada:** la tabla `projects` debe tener `image_url` (nullable). La migración ya existe: **[docs/sql/003_add_project_cover_image.sql](sql/003_add_project_cover_image.sql)** — ejecutar después de 002. El modelo del backend debe mapear esa columna y exponerla como `imageUrl` en las respuestas JSON. Las fotos en sí se guardan en S3 (o similar) más adelante; en la BD solo va la URL. Ver sección 4 de [BACKEND-PROJECT-COVER-IMAGE.md](./BACKEND-PROJECT-COVER-IMAGE.md) para el checklist cuando integres almacenamiento.
