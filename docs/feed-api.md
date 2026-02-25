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

## 4. Listar comentarios de una publicación

**GET** `/feed/posts/:postId/comments?page=1&limit=50`

**Query params (opcionales):**

- `page`: página (1-based). Default 1.
- `limit`: por página. Default 50, máximo 100.

**Respuesta 200:**

```json
{
  "comments": [ /* ver formato FeedComment */ ],
  "page": 1,
  "limit": 50,
  "total": 12
}
```

Orden: `createdAt` ascendente (más antiguos primero).

**404** si la publicación no existe. **401** si no hay token. **403** si no tienes permiso para ver el post (ej. audiencia "only_me" de otro usuario).

---

## 5. (Opcional) Resolver perfil por id de usuario

**GET** `/users/:id`  
**Headers:** `Authorization: Bearer <token>`

Devuelve datos públicos del usuario para que el frontend pueda redirigir `/profile/id/:id` → `/profile/:username` cuando exista `username`.

**Respuesta 200:**

```json
{
  "id": "uuid-del-usuario",
  "username": "maria-garcia",
  "name": "María García",
  "avatarUrl": null
}
```

`username` es **siempre un string no vacío**: si el usuario tiene `username` en BD se usa; si no, fallback desde el nombre (slug) o `u-{id}`. El frontend puede redirigir a `/profile/:username`.

**404** si el usuario no existe. **401** si no autenticado.

---

## 6. Crear comentario (o respuesta)

**POST** `/feed/posts/:postId/comments`

**Body (JSON):**

| Campo     | Tipo   | Requerido | Descripción |
|-----------|--------|-----------|-------------|
| `text`    | string | sí       | Contenido. Máx. 2000 caracteres. |
| `parentId`| string \| null | no | Si se envía (UUID), es respuesta a ese comentario. `null` u omitir = comentario de primer nivel. |

**Respuesta 201:** objeto en formato FeedComment.

**400** si `text` vacío, supera el límite, o `parentId` no existe o no pertenece al mismo post.  
**404** si la publicación no existe. **401** si no autenticado. **403** si no puedes comentar en esa publicación.

---

## Formato FeedComment

Cada comentario tiene esta forma:

| Campo           | Tipo   | Descripción |
|-----------------|--------|-------------|
| `id`            | string | UUID del comentario. |
| `postId`        | string | ID de la publicación. |
| `parentId`      | string \| null | `null` = primer nivel; UUID = respuesta a ese comentario. |
| `authorId`      | string | UUID del autor; para enlace `/profile/id/:id` si no hay username. |
| `authorName`    | string | Nombre del autor. |
| `authorUsername`| string \| null | Para enlace a perfil (puede ser `null`). |
| `authorAvatar`  | string \| null | URL de avatar (puede ser `null`). |
| `text`          | string | Contenido. |
| `createdAt`     | string | Fecha ISO. |

---

## Formato FeedPost

Cada ítem del feed tiene esta forma:

| Campo             | Tipo   | Descripción |
|-------------------|--------|-------------|
| `id`              | string | UUID de la publicación. |
| `authorId`        | string | UUID del usuario autor; para enlace `/profile/id/:id` si no hay username. |
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
- `docs/sql/005_create_feed_comments.sql` — crea tabla `feed_comments`.
- `docs/sql/006_add_users_username.sql` — añade columna `username` a `users` (para GET /users/:id y authorUsername en feed/comentarios).
