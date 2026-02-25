# API: Obtener usuario por ID (perfil público)

Este documento es el **prompt/especificación** para implementar en el backend el endpoint **GET /users/:id**, de forma que el frontend pueda resolver un usuario por su `id` y redirigir al perfil por `username` (Opción A).

---

## Contexto

- En el **feed de publicaciones** y en los **comentarios**, el frontend muestra el nombre del autor como enlace.
- Si el backend solo envía `authorId` (y no `authorUsername`) en cada publicación/comentario, el enlace apunta a **`/profile/id/:id`**.
- Esa página del frontend llama a **GET /users/:id** para obtener el `username` del usuario y redirigir a **`/profile/:username`**.
- Si el endpoint no existe o falla, el usuario ve "No se pudo cargar este perfil."

---

## Endpoint a implementar

**Método y ruta:**

```
GET /users/:id
```

**Base URL:** la misma del backend (ej. `http://localhost:8080`).

**Cabeceras:**

| Cabecera            | Descripción |
|---------------------|-------------|
| `Authorization`     | Opcional. `Bearer <access_token>`. Si el endpoint es público (solo datos públicos), puede no ser obligatorio. |
| `Content-Type`      | No requerido para GET. |

**Parámetro de ruta:**

| Parámetro | Tipo   | Descripción |
|-----------|--------|-------------|
| `id`      | string | Identificador único del usuario (UUID o el que use tu modelo de usuario). |

---

## Respuestas

### 200 OK

Cuerpo: objeto JSON con al menos el campo **`username`** (string). El frontend usa este valor para redirigir a `/profile/:username`.

**Ejemplo mínimo:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "eduardo-bohorquez"
}
```

**Ejemplo ampliado** (puedes incluir más datos públicos si los usas en el perfil):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "eduardo-bohorquez",
  "name": "Eduardo Bohórquez",
  "avatarUrl": "https://..."
}
```

**Requisito para el frontend:** el cuerpo debe tener la propiedad `username` y ser un string no vacío. Sin eso, el frontend no redirige y muestra "No se pudo cargar este perfil."

### 404 Not Found

Cuando no exista un usuario con ese `id`. El frontend mostrará el mensaje de error y el botón "Volver al inicio".

### 401 Unauthorized

Solo si decides que el endpoint requiera autenticación y no se envía token o es inválido.

---

## Resumen para el desarrollador backend

1. **Implementar GET /users/:id**
   - Recibir el `id` del usuario en la URL.
   - Buscar el usuario en base de datos (por `id`).
   - Si existe, responder **200** con un JSON que incluya al menos `username` (string no vacío).
   - Si no existe, responder **404**.

2. **Formato de respuesta**
   - Obligatorio: `username` (string), para que el frontend redirija a `/profile/:username`.
   - Opcional: `id`, `name`, `avatarUrl` u otros datos públicos del perfil.

3. **Seguridad**
   - Devolver solo datos adecuados para un perfil público (nombre, username, avatar). No incluir email ni datos sensibles a menos que sea el propio usuario y esté autenticado.

4. **Consistencia con el feed**
   - El mismo `id` que devuelves en `authorId` en GET /feed/posts (y en comentarios) debe ser el que acepte GET /users/:id, para que el flujo "clic en autor → /profile/id/:id → GET /users/:id → redirección a /profile/:username" funcione.

Con esto implementado, al hacer clic en el nombre del autor de una publicación el usuario llegará correctamente a su perfil en lugar de ver "No se pudo cargar este perfil."

---

## Estado de implementación

**Implementado en este backend.**

- **GET /users/:id** con JWT: `src/user/user.controller.ts`, `src/user/user.service.ts`.
- Respuesta incluye `username` (string no vacío): si el usuario tiene `username` en BD se usa; si no, fallback desde `name` (slug) o `u-{id}`.
- Tabla `users` tiene columna opcional `username`: `docs/sql/006_add_users_username.sql`.
- Util compartido `publicUsername()` en `src/common/username.util.ts` para que el feed y los comentarios devuelvan el mismo `authorUsername` que GET /users/:id usaría.
