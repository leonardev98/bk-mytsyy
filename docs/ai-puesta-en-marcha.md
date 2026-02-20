# Chat IA — Puesta en marcha inicial

## ¿Qué tienes ya?

- Módulo NestJS `AiModule` con LangChain + LangGraph.
- Endpoint **POST /ai/chat** que recibe el mensaje del usuario y devuelve el estado de la conversación (objetivo, habilidades, restricciones, proyecto estructurado, roadmap 30 días).
- La integración está lista para que el frontend llame a ese endpoint (contrato en **docs/ai-frontend-api.md**).

## Lo único que necesitas para que funcione

### 1. Token / API Key (solo uno)

**No hace falta un token de LangChain.** LangChain y LangGraph solo orquestan; el modelo lo llama **OpenAI**. Solo necesitas:

- **OPENAI_API_KEY** en tu `.env`

Pasos:

1. Entra en [OpenAI API Keys](https://platform.openai.com/api-keys).
2. Crea una API key.
3. En la raíz del proyecto, abre `.env` y pon:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
```

4. Reinicia el backend (`pnpm run dev` o `nest start --watch`).

Si no pones la key, el backend arranca igual, pero **POST /ai/chat** responderá **503** con un mensaje indicando que falta la key.

### 2. (Opcional) Modelo

Por defecto se usa `gpt-4o`. Para usar otro modelo:

```env
OPENAI_MODEL=gpt-4o-mini
```

### 3. Frontend

- **URL del backend**: la que uses en tu app (ej. `http://localhost:8080`).
- **Ruta**: `POST /ai/chat`.
- **Body**: `{ "message": "texto del usuario" }`.
- **Respuesta**: `{ success: true, data: { ... } }` con el estado de la conversación.

Detalle del contrato (tipos, errores, ejemplo fetch): **docs/ai-frontend-api.md**.

### 4. CORS

Si el frontend corre en otro origen (ej. `http://localhost:3000`), en `.env` debe coincidir:

```env
FRONTEND_URL=http://localhost:3000
```

(El backend ya usa esta variable para CORS.)

---

## Resumen

| Qué                | Dónde / Cómo                                      |
|--------------------|---------------------------------------------------|
| API Key de OpenAI  | `.env` → `OPENAI_API_KEY=sk-...`                 |
| Modelo (opcional)  | `.env` → `OPENAI_MODEL=gpt-4o` (o otro)          |
| Contrato frontend  | **docs/ai-frontend-api.md**                       |
| Detalles técnicos  | **docs/ai-orchestration.md**                      |

Con **OPENAI_API_KEY** en `.env` y el backend en marcha, el chat IA ya funciona; el frontend solo tiene que llamar a **POST /ai/chat** y usar `data` de la respuesta.
