# API de feed de publicaciones (backend)

El frontend ya tiene el flujo de **Crear publicación**: modal tipo Facebook, botón "Publicar" con ícono +, selector de audiencia (Público / Builders / Solo yo) y área de texto. Las publicaciones se muestran en el **Feed de ejecución pública** con tarjetas que incluyen autor, texto, tiempo, día de progreso y reacciones.

Este documento es el **prompt/especificación** para implementar en el backend la API de publicaciones del feed, de forma que el frontend pueda persistir y listar publicaciones en lugar de usar solo estado local.

---

## Contexto frontend

- **Autenticación:** igual que proyectos; todas las peticiones llevan `Authorization: Bearer <access_token>`.
- **Modelo en UI:** cada publicación se representa como `FeedPost` (ver más abajo). El autor se obtiene del usuario autenticado al crear; al listar, el backend debe devolver los campos que el frontend espera.
- **Audiencia:** el modal permite elegir "Público", "Builders" o "Solo yo". El backend debe guardar este valor y usarlo al listar (p. ej. "Solo yo" solo visible para el autor; "Builders" para usuarios de la plataforma; "Público" para todos si hay roles/visibilidad).

---

## Endpoints a implementar (todos con JWT)

Base URL: la misma del backend (ej. `http://localhost:8080`).

---

### 1. Crear publicación

```
POST /feed/posts
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Body:**

```json
{
  "text": "Día 12/30 – Hoy lancé la landing. Primeros visitantes.",
  "audience": "public",
  "currentDay": 12,
  "totalDays": 30,
  "progressPercent": 40
}
```

| Campo            | Tipo   | Requerido | Descripción |
|------------------|--------|-----------|-------------|
| `text`           | string | sí        | Contenido de la publicación. Límite razonable (ej. 2000 caracteres). |
| `audience`       | string | no        | `"public"` \| `"builders"` \| `"only_me"`. Default `"public"`. |
| `currentDay`     | number | no        | Día actual del plan (ej. 12). Default 0. |
| `totalDays`      | number | no        | Total de días del plan (ej. 30). Default 30. |
| `progressPercent`| number | no        | Porcentaje de progreso 0–100. Default 0. |

El backend debe:

- Extraer el `userId` (y datos de usuario si los tiene) del JWT.
- Crear la publicación asociada a ese usuario.
- Guardar `audience`, `currentDay`, `totalDays`, `progressPercent` si se envían.
- Devolver el objeto de publicación en el formato de respuesta indicado más abajo.

**Respuesta 201:** objeto `FeedPost` (formato esperado por el frontend, ver sección siguiente).  
**401** si no hay token o es inválido.

---

### 2. Listar publicaciones del feed

```
GET /feed/posts
Authorization: Bearer <access_token>
```

**Query params (opcionales):**

| Parametro | Tipo   | Descripción |
|-----------|--------|-------------|
| `page`    | number | Página (1-based). Default 1. |
| `limit`   | number | Cantidad por página (ej. 20). Default 20, máximo ej. 50. |

Reglas de visibilidad:

- Incluir publicaciones donde `audience = "public"`.
- Incluir publicaciones donde `audience = "builders"` para cualquier usuario autenticado (o según regla de negocio: solo "builders").
- Incluir publicaciones del propio usuario con `audience = "only_me"` solo para ese usuario.
- Ordenar por fecha de creación descendente (más recientes primero).

**Respuesta 200:** objeto con lista de publicaciones y metadatos de paginación, por ejemplo:

```json
{
  "posts": [ /* ver formato FeedPost abajo */ ],
  "page": 1,
  "limit": 20,
  "total": 42
}
```

O, si se prefiere consistencia con otros endpoints del proyecto, un array directo:

```json
[ { ... }, { ... } ]
```

El frontend puede adaptarse a cualquiera de los dos; si usas objeto con `posts`, documentar la forma.

**401** si no hay token o es inválido.

---

### 3. (Opcional) Reaccionar a una publicación

El frontend muestra un contador de reacciones y permite "dar like". Se puede implementar en una segunda iteración.

```
POST /feed/posts/:id/reactions
Authorization: Bearer <access_token>
```

- Si el usuario aún no ha reaccionado: añadir reacción (ej. "like") y devolver **200** o **201** con `reactionCount` actualizado.
- Si ya reaccionó: quitar reacción (toggle) y devolver **200** con `reactionCount` actualizado.

**Respuesta:** cuerpo con al menos `reactionCount` (number) y, si aplica, indicación de si el usuario actual ha reaccionado (para pintar corazón lleno/vacío).

**404** si la publicación no existe. **401** si no autenticado.

---

## Formato de publicación (FeedPost) esperado por el frontend

El frontend espera cada ítem del feed con esta forma (TypeScript):

```ts
type FeedPost = {
  id: string;
  authorName: string;
  authorId?: string | null;      // id del usuario autor; permite enlazar a /profile/id/:id si no hay username
  authorUsername?: string | null;
  authorAvatar?: string | null;
  time: string;           // ej. "Hace 2 h", "Ayer", "Ahora", o ISO y el frontend formatea
  text: string;
  currentDay: number;
  totalDays?: number;
  progressPercent?: number;
  evidenceImageUrl?: string | null;
  evidenceLink?: string | null;
  reactionCount: number;
};
```

El backend debe devolver al menos:

- `id`: identificador único de la publicación.
- `authorName`: nombre para mostrar del autor (desde tabla `users` o equivalente).
- `authorId`: (recomendado) id del usuario autor; el frontend lo usa para enlazar al perfil (`/profile/id/:id`) cuando no hay `authorUsername`.
- `authorUsername`: si existe en el modelo de usuario, slug/username para el enlace al perfil (ej. `/profile/:username`).
- `authorAvatar`: URL de avatar si existe; si no, `null` o omitir.
- `time`: texto legible ("Hace 2 h", "Ayer", "Ahora") o fecha ISO (ej. `createdAt`) para que el frontend formatee.
- `text`: contenido de la publicación.
- `currentDay`, `totalDays`, `progressPercent`: números guardados al crear (o defaults).
- `evidenceImageUrl`, `evidenceLink`: opcionales; se pueden dejar en `null` o no incluirlos hasta que se implemente adjuntar imagen/enlace.
- `reactionCount`: número de reacciones (0 si no hay endpoint de reacciones aún).

Si en la base de datos guardas `createdAt`, puedes devolverlo además de (o en lugar de) `time` y que el frontend formatee; en ese caso documentar el campo (ej. `createdAt: "2025-02-22T10:30:00Z"`).

---

## (Opcional) Resolver perfil por id de usuario

Para que los enlaces "por id" (`/profile/id/:id`) redirijan al perfil por username, el backend puede exponer:

```
GET /users/:id
Authorization: Bearer <access_token>   (opcional; puede ser público si solo devuelves datos públicos)
```

**Respuesta 200:** objeto con al menos `username` (string) para que el frontend redirija a `/profile/:username`. Ejemplo:

```json
{
  "id": "uuid-del-usuario",
  "username": "maria-garcia",
  "name": "María García"
}
```

Si este endpoint no existe, el frontend sigue mostrando el enlace a `/profile/id/:id`; la página intentará cargar el perfil y, si el backend no implementa la resolución, se mostrará "No se pudo cargar este perfil". Los comentarios pueden incluir también `authorId` (y opcionalmente `authorUsername`) en el mismo formato que las publicaciones.

---

## Resumen para el desarrollador backend

1. **POST /feed/posts**  
   Crear publicación con `text` (obligatorio), `audience`, `currentDay`, `totalDays`, `progressPercent` (opcionales). Usuario desde JWT. Respuesta 201 con objeto en formato FeedPost.

2. **GET /feed/posts**  
   Listar publicaciones con paginación (`page`, `limit`), aplicando reglas de audiencia (public / builders / only_me). Respuesta 200 con array (o `{ posts, page, limit, total }`) en formato FeedPost.

3. **(Opcional) POST /feed/posts/:id/reactions**  
   Toggle de reacción del usuario; respuesta con `reactionCount` (y si el usuario reaccionó).

4. **Formato FeedPost**  
   Incluir en cada ítem: `id`, `authorName`, `authorId` (recomendado), `authorUsername` (opcional), `authorAvatar` (opcional), `time` (o `createdAt`), `text`, `currentDay`, `totalDays`, `progressPercent`, `reactionCount`. Opcionales: `evidenceImageUrl`, `evidenceLink`.

5. **(Opcional) GET /users/:id**  
   Devuelve `username` (y datos públicos) para que el frontend redirija `/profile/id/:id` → `/profile/:username`.

6. **Auth**  
   Mismo mecanismo que proyectos: `Authorization: Bearer <access_token>`, validar JWT y asociar publicaciones al `userId`.

Con esto el frontend puede sustituir el estado local del feed por llamadas a esta API (crear al publicar y GET para cargar/recargar el feed).

---

## Estado de implementación

**Implementado en este backend.** Ver:

- `src/feed/feed.controller.ts` — rutas POST/GET posts, POST reactions.
- `src/feed/feed.service.ts` — lógica y formato FeedPost.
- `docs/feed-api.md` — documentación de la API expuesta.
- `docs/sql/004_create_feed_posts.sql` — tablas `feed_posts` y `feed_reactions`.
- `src/user/user.controller.ts` — GET `/users/:id` (perfil público por id).
