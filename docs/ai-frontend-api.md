# API del chat IA — 3 modos (EXPLORATION, PROPOSAL, EXECUTION)

## Endpoint

```
POST /ai/chat
Content-Type: application/json
```

## Request

```json
{
  "message": "Tengo una idea de app para pequeños comercios",
  "history": [
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "Tengo una idea de app" }
  ],
  "selectedProposal": null,
  "attachedContent": null
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `message` | string | sí | Mensaje actual del usuario (máx 4000 caracteres). |
| `history` | `{ role: "user" \| "assistant", content: string }[]` | no | Últimos mensajes de la conversación para que la IA detecte el modo. |
| `selectedProposal` | `{ title, pitch?, whyItWins? } \| null` | no | Cuando el usuario eligió una propuesta (modo EXECUTION), enviar la seleccionada. |
| `attachedContent` | string | no | Texto extraído de un archivo adjunto (PDF, TXT, Word). Si se envía, la IA responde en **execution** directo (roadmap 30 días), sin preguntas ni 3 propuestas. Máx 50.000 caracteres. Ver [Flujo documento](./frontend-document-flow-prompt.md). |

La IA detecta automáticamente el modo según el mensaje, el historial y si hay `attachedContent`. **1 llamada por turno.**

---

## Respuesta: tres modos posibles

Todas las respuestas incluyen `data.mode`. Según el modo, el resto del objeto cambia.

### Modo 1: `exploration` (conversación + pregunta guía)

La IA responde como un **coach**: puede charlar, reaccionar o hacer **como mucho una** pregunta guía por turno (idea → cliente ideal → problema). No es un interrogatorio: a veces solo hay texto conversacional y ninguna pregunta. Siempre enviar **history** para que el contexto sea correcto.

```json
{
  "success": true,
  "data": {
    "mode": "exploration",
    "reply": "¡Hola! Qué bien que estés por aquí. Cuando quieras, cuéntame en qué andas.",
    "questions": []
  }
}
```

O con pregunta guía:

```json
{
  "success": true,
  "data": {
    "mode": "exploration",
    "reply": "Mola lo de las zapatillas.",
    "questions": ["¿A quién se las quieres vender?"]
  }
}
```

**Frontend:** Mostrar **una sola burbuja** con `data.reply` (si existe) y, si `data.questions` tiene elementos, añadir `data.questions[0]` en la misma burbuja. Si solo hay `reply`, mostrar solo eso (conversación sin pregunta). No usar preguntas fijas; todo viene del API. Ver [Prompt para el frontend (chat conversacional)](./frontend-chat-prompt.md). No mostrar CTA "Crear proyecto" ni roadmap en exploration.

---

### Modo 2: `proposal` (suficiente claridad → 3 propuestas)

La IA genera exactamente 3 propuestas tipo pitch. No genera roadmap todavía.

```json
{
  "success": true,
  "data": {
    "mode": "proposal",
    "proposals": [
      {
        "title": "Marketplace de comercios locales",
        "pitch": "Una plaza digital donde barrios compran y venden con un clic.",
        "whyItWins": "Escalable por ciudad, comisión por transacción."
      },
      { "title": "...", "pitch": "...", "whyItWins": "..." },
      { "title": "...", "pitch": "...", "whyItWins": "..." }
    ],
    "frontendHint": {
      "display": "cards",
      "cardCount": 3,
      "primaryCTA": "Seleccionar proyecto"
    }
  }
}
```

**Frontend:** Mostrar **3 cards** con `title`, `pitch`, `whyItWins` y botón según `frontendHint.primaryCTA` ("Seleccionar proyecto"). El usuario **debe elegir una**. No mostrar roadmap hasta que elija y pase a execution.

---

### Modo 3: `execution` (roadmap: 30 días)

Se usa en dos casos: (1) el usuario **eligió una** de las 3 propuestas, o (2) el usuario **adjuntó un documento** con su proyecto (`attachedContent`). En ambos la IA devuelve el roadmap de 4 semanas (primeros 30 días).

```json
{
  "success": true,
  "data": {
    "mode": "execution",
    "introMessage": "He leído tu proyecto. Aquí tienes tu plan para los primeros 30 días.",
    "selectedProject": {
      "title": "Marketplace de comercios locales",
      "description": "..."
    },
    "roadmap": {
      "weeks": [
        { "week": 1, "goals": ["..."], "actions": ["..."] },
        { "week": 2, "goals": ["..."], "actions": ["..."] },
        { "week": 3, "goals": ["..."], "actions": ["..."] },
        { "week": 4, "goals": ["..."], "actions": ["..."] }
      ]
    }
  }
}
```

- `introMessage` (opcional): mensaje corto del asistente; suele venir cuando la respuesta es por **documento adjunto**.
- `selectedProject`: título y descripción del proyecto (elegido o extraído del documento).
- `roadmap.weeks`: 4 semanas con `goals` y `actions`.

**Frontend:** Mostrar `introMessage` (si existe), luego el proyecto y el plan de 4 semanas. CTA tipo "Crear proyecto" / "Añadir a dashboard".

---

## Cómo enviar la selección (modo EXECUTION)

Cuando el usuario pulse "Seleccionar proyecto" en una card, en el **siguiente** mensaje envía la propuesta elegida:

```json
{
  "message": "Quiero la segunda",
  "history": [ ... ],
  "selectedProposal": {
    "title": "SaaS de pedidos para bares",
    "pitch": "...",
    "whyItWins": "..."
  }
}
```

Así la IA genera el roadmap para esa propuesta.

---

## Errores

- **400** — Body inválido (p. ej. `message` vacío o demasiado largo).
- **503** — `OPENAI_API_KEY` no configurada en el backend.

---

## Streaming (SSE)

```
POST /ai/chat/stream
Body: { "message": "...", "history": [...], "selectedProposal": null }
```

Eventos: **started** (inmediato), **complete** (respuesta con `mode` + datos). Una sola llamada por turno, por eso solo hay un bloque de datos al final.

---

## Guía para el frontend (adecuar a los 3 modos)

1. **Siempre enviar `history`** en cada request: los últimos mensajes (user + assistant) para que la IA sepa el contexto. Sin history, la conversación se pierde.

2. **Exploration:** Mostrar `data.reply` (si existe) y, si hay, `data.questions[0]` en la misma burbuja. No uses preguntas fijas; el tono es conversacional. Detalle en [frontend-chat-prompt.md](./frontend-chat-prompt.md).

3. **Proposal:** Mostrar las 3 propuestas como cards. Botón "Seleccionar proyecto" (o `frontendHint.primaryCTA`) en cada card. **No** mostrar roadmap ni "Crear proyecto" aquí; el usuario primero elige una card.

4. **Cuando el usuario pulse "Seleccionar proyecto"** en una card, en el **siguiente** request enviar `selectedProposal: { title, pitch, whyItWins }` de esa card (y `message` tipo "La primera" o "Esta"). Solo entonces el backend devolverá `mode: "execution"` con el roadmap.

5. **Execution:** Mostrar `selectedProject` y `roadmap.weeks` (4 semanas). Aquí sí mostrar el CTA "Crear proyecto" / añadir a dashboard.

Orden real: exploration (varias vueltas, 1 pregunta cada vez) → **proposal (3 opciones)** → usuario elige → execution (roadmap 4 semanas).

---

## Por qué puede verse la misma pregunta dos veces (duplicado)

**Qué envía el backend:** En modo `exploration` el backend puede enviar `reply` (texto conversacional) y/o `questions` (como mucho una pregunta). A veces `questions` viene vacío (solo conversación).

**Si aun así ves la misma pregunta duplicada en el hilo**, en la pestaña Network (Fetch/XHR) suele haber **dos peticiones** a `POST /ai/chat` con status 201 para el mismo mensaje del usuario (ej. "hola"). Eso significa que el problema está en el frontend:

1. **Se está llamando a la API dos veces por un solo mensaje**
   - Causas típicas: doble clic en enviar, `useEffect` sin dependencias bien controladas que dispara dos requests, o dos componentes que reaccionan al mismo mensaje y cada uno hace un POST.
   - **Solución:** Un solo `POST /ai/chat` por mensaje de usuario. Deshabilitar el botón de enviar mientras `loading`, o usar un `ref` / flag para ignorar un segundo envío hasta que termine el primero. No disparar el fetch en dos sitios distintos para el mismo mensaje.

2. **Se están añadiendo dos mensajes de asistente al hilo para el mismo turno**
   - Por ejemplo: un mensaje de bienvenida que repite el mismo texto que luego devuelve el API.
   - **Solución:** Por cada respuesta del API, **un solo** mensaje de asistente. Bienvenida inicial corta y genérica (ver [frontend-chat-prompt.md](./frontend-chat-prompt.md)); el resto del contenido solo desde el API.

**Resumen para el frontend:** Mostrar `data.reply` y, si existe, `data.questions[0]`. Una sola llamada a `/ai/chat` por mensaje de usuario y una sola burbuja de asistente por respuesta.

## CORS

El backend usa `FRONTEND_URL` (por defecto `http://localhost:3000`).

---

## Ejemplo (fetch)

```ts
const res = await fetch('http://localhost:8080/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    history: conversationHistory, // últimos mensajes
    selectedProposal: selectedCard ?? null,
  }),
});
const json = await res.json();
const { data } = json;
if (data.mode === 'exploration') {
  // Mostrar data.reply (si existe) y data.questions[0] (si existe)
} else if (data.mode === 'proposal') {
  // Mostrar data.proposals como cards, data.frontendHint.primaryCTA
} else if (data.mode === 'execution') {
  // Mostrar data.selectedProject y data.roadmap.weeks
}
```
