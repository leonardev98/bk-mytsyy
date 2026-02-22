# API de feed de publicaciones

Todos los endpoints requieren `Authorization: Bearer <access_token>` (JWT).

Base URL: la misma del backend (ej. `http://localhost:8080`).

---

## 1. Crear publicación

**POST** `/feed/posts`

**Body (JSON):**

| Campo            | Tipo   | Requerido | Descripción |
|------------------|--------|-----------|-------------|
| `text`           | string | sí        | Contenido. Máx. 2000 caracteres. |
| `audience`       | string | no        | `"public"` \| `"builders"` \| `"only_me"`. Default `"public"`. |
| `currentDay`     | number | no        | Día actual del plan. Default 0. |
| `totalDays`      | number | no        | Total de días del plan. Default 30. |
| `progressPercent`| number | no        | 0–100. Default 0. |

**Respuesta 201:** objeto en formato FeedPost (ver más abajo).

**401** si no hay token o es inválido.

---

## 2. Listar publicaciones

**GET** `/feed/posts?page=1&limit=20`

**Query params (opcionales):**

- `page`: número de página (1-based). Default 1.
- `limit`: cantidad por página. Default 20, máximo 50.

**Reglas de visibilidad:**

- Se incluyen publicaciones con `audience = "public"`.
- Se incluyen publicaciones con `audience = "builders"` para cualquier usuario autenticado.
- Se incluyen publicaciones con `audience = "only_me"` solo para el autor.

**Respuesta 200:**

```json
{
  "posts": [ /* ver formato FeedPost */ ],
  "page": 1,
  "limit": 20,
  "total": 42
}
```

**401** si no hay token o es inválido.

---

## 3. Reaccionar (toggle like)

**POST** `/feed/posts/:id/reactions`

- Si el usuario no ha reaccionado: se añade la reacción (like).
- Si ya reaccionó: se quita (toggle).

**Respuesta 200:**

```json
{
  "reactionCount": 5,
  "hasReacted": true
}
```

**404** si la publicación no existe. **401** si no autenticado.

---

## Formato FeedPost

Cada ítem del feed tiene esta forma:

| Campo             | Tipo   | Descripción |
|-------------------|--------|-------------|
| `id`              | string | UUID de la publicación. |
| `authorName`      | string | Nombre para mostrar del autor. |
| `authorUsername`  | string \| null | Opcional; si existe en el usuario. |
| `authorAvatar`    | string \| null | URL de avatar; null si no hay. |
| `time`            | string | Fecha ISO (ej. `createdAt`) para formatear en frontend. |
| `createdAt`       | string | Fecha ISO de creación. |
| `text`            | string | Contenido. |
| `currentDay`      | number | Día actual. |
| `totalDays`       | number | Total de días. |
| `progressPercent` | number | Porcentaje 0–100. |
| `evidenceImageUrl`| string \| null | Opcional. |
| `evidenceLink`    | string \| null | Opcional. |
| `reactionCount`   | number | Número de reacciones. |
| `hasReacted`       | boolean | Si el usuario actual ha reaccionado (solo en listado). |

---

## Migración SQL

Ejecutar en la base de datos antes de usar la API:

- `docs/sql/004_create_feed_posts.sql` — crea tablas `feed_posts` y `feed_reactions`.
