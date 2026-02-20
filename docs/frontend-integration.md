# Guía de integración Frontend → Backend

Este documento explica qué debes configurar en tu frontend (otro repositorio) para conectarlo al backend Mytsyy (bk-mytsyy).

---

## 1. Variables de entorno en el Frontend

Crea o edita `.env.local` (Next.js) o `.env` según tu stack:

```env
# URL base del API (backend bk-mytsyy)
NEXT_PUBLIC_API_URL=http://localhost:8080
```

- **Desarrollo local:** `http://localhost:8080` (backend por defecto en puerto 8080)
- **Producción:** `https://tu-backend.desplegado.com` (la URL real del backend)

En Next.js usa el prefijo `NEXT_PUBLIC_` para que la variable esté disponible en el cliente.

---

## 2. Configuración del Backend (para que acepte tu frontend)

En el backend, el `.env` debe tener:

```env
PORT=8080
FRONTEND_URL=http://localhost:3000
```

- `FRONTEND_URL` es el origen permitido por CORS. Debe coincidir con la URL donde corre tu frontend.
- En producción, usa la URL real del frontend (ej: `https://app.mytsyy.com`).

---

## 3. Endpoints disponibles

Base URL: `{NEXT_PUBLIC_API_URL}` (ej: `http://localhost:8080`)

**Autenticación (registro y login):** Ver [frontend-auth-api.md](./frontend-auth-api.md) para `POST /auth/register`, `POST /auth/login` y `GET /auth/me`.

### Obtener mensajes iniciales del chat

```
GET /chat/messages
```

**Respuesta:** array de mensajes

```json
[
  {
    "id": "0",
    "role": "assistant",
    "content": "Hola. Soy tu mentor para ayudarte...",
    "createdAt": "2025-02-15T12:00:00.000Z"
  }
]
```

### Enviar mensaje al chat

```
POST /chat
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Quiero empezar un negocio de venta de productos digitales"
}
```

**Respuesta:** mensaje del asistente

```json
{
  "id": "uuid-generado",
  "role": "assistant",
  "content": "Entendido. Has dicho: \"...\" ...",
  "createdAt": "2025-02-15T12:01:00.000Z"
}
```

---

## 4. Ejemplo de uso en el Frontend (JavaScript/TypeScript)

### Obtener mensajes iniciales

```ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const res = await fetch(`${apiUrl}/chat/messages`);
const messages = await res.json();
```

### Enviar mensaje

```ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const res = await fetch(`${apiUrl}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Tu mensaje aquí' }),
});
const assistantMessage = await res.json();
```

### Manejo de errores

```ts
const res = await fetch(`${apiUrl}/chat`, { ... });

if (!res.ok) {
  throw new Error('Error al enviar mensaje');
}
const data = await res.json();
```

---

## 5. Cómo probar la conexión

1. Inicia el backend: `pnpm run start:dev` (en bk-mytsyy)
2. Verifica que responda: `curl http://localhost:8080/chat/messages`
3. Inicia tu frontend y asegúrate de que `NEXT_PUBLIC_API_URL` apunte a `http://localhost:8080`
4. Asegúrate de que `FRONTEND_URL` en el backend coincida con la URL de tu frontend (ej: `http://localhost:3000` para Next.js)

---

## 6. Resumen

| En el Backend (bk-mytsyy)   | En el Frontend (otro repo)     |
|----------------------------|---------------------------------|
| `PORT=8080`                | `NEXT_PUBLIC_API_URL=http://localhost:8080` |
| `FRONTEND_URL=http://localhost:3000` | Tu app debe correr en esa URL para CORS |
