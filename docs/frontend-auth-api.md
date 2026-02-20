# API de autenticación – Integración frontend

Base URL: `{API_URL}` (ej: `http://localhost:8080`)

---

## 1. Registro

**POST** `/auth/register`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "minimo6caracteres",
  "name": "Nombre opcional"
}
```

- `email`: obligatorio, formato email válido.
- `password`: obligatorio, mínimo 6 caracteres.
- `name`: opcional.

**Respuesta 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Nombre opcional"
  }
}
```

**Errores:**
- `400`: validación (email inválido, contraseña corta, etc.). Body con `message` y a veces `error`.
- `409`: "Ya existe un usuario con ese email".

---

## 2. Login

**POST** `/auth/login`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Nombre opcional"
  }
}
```

**Errores:**
- `400`: validación (email inválido, etc.).
- `401`: "Email o contraseña incorrectos".

---

## 3. Obtener perfil (ruta protegida)

**GET** `/auth/me`

**Headers:** `Authorization: Bearer {access_token}`

**Respuesta 200:**
```json
{
  "id": "uuid-del-usuario",
  "email": "usuario@ejemplo.com",
  "name": "Nombre opcional",
  "createdAt": "2025-02-15T12:00:00.000Z"
}
```

**Errores:**
- `401`: sin token, token inválido o expirado.

---

## 4. Uso en el frontend

### Después de registro o login
1. Guardar `access_token` (ej: en memoria, `localStorage` o cookie httpOnly).
2. Guardar `user` si quieres mostrar nombre/email sin llamar a `/auth/me`.
3. En cada petición a rutas protegidas, enviar:  
   `Authorization: Bearer {access_token}`.

### Ejemplo: registro
```ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const res = await fetch(`${apiUrl}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'Mi nombre',
  }),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.message ?? 'Error al registrarse');
}

const { access_token, user } = await res.json();
// Guardar access_token y user en estado / storage
```

### Ejemplo: login
```ts
const res = await fetch(`${apiUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.message ?? 'Error al iniciar sesión');
}

const { access_token, user } = await res.json();
// Guardar access_token y user
```

### Ejemplo: obtener perfil (comprobar sesión)
```ts
const token = '...'; // desde tu estado o storage

const res = await fetch(`${apiUrl}/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (res.status === 401) {
  // Token inválido o expirado → cerrar sesión
  return;
}

const user = await res.json();
```

---

## 5. Resumen para el frontend

| Acción        | Método | Ruta            | Body                    | Headers              |
|---------------|--------|-----------------|-------------------------|----------------------|
| Registrarse   | POST   | `/auth/register`| email, password, name? | Content-Type: json   |
| Iniciar sesión| POST   | `/auth/login`   | email, password         | Content-Type: json   |
| Ver perfil    | GET    | `/auth/me`      | —                       | Authorization: Bearer |

- Registro y login devuelven `access_token` y `user`. Usar el token en `Authorization: Bearer {token}` para `/auth/me` y el resto de rutas protegidas que se añadan en el futuro.
- El token expira en 7 días; pasado ese tiempo hay que volver a hacer login.

---

## 6. Prompt para integrar en el frontend

Puedes usar este texto como prompt o especificación para tu equipo o para una IA al implementar el frontend:

```
Integra los botones de Registro y Login con el backend Mytsyy.

Base URL del API: variable de entorno (ej. NEXT_PUBLIC_API_URL) o http://localhost:8080.

Servicios a consumir:

1) POST /auth/register
   Body: { email: string, password: string (mín. 6), name?: string }
   Respuesta OK: { access_token: string, user: { id, email, name } }
   Errores: 400 validación, 409 email ya existe.

2) POST /auth/login
   Body: { email: string, password: string }
   Respuesta OK: { access_token: string, user: { id, email, name } }
   Errores: 400 validación, 401 credenciales incorrectas.

3) GET /auth/me (ruta protegida)
   Header: Authorization: Bearer {access_token}
   Respuesta OK: { id, email, name, createdAt }
   Error: 401 si no hay token o es inválido.

Flujo: Tras registro o login, guardar access_token y user. En peticiones a rutas protegidas enviar header Authorization: Bearer {token}. El token expira en 7 días.
```
