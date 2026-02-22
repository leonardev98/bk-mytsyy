# Frontend: integración con el agente estratégico

Guía para que el frontend aproveche el agente con state machine, memoria y progreso.

---

## 1. Qué enviar en cada request

### Siempre que quieras usar el agente estratégico

Envía **`sessionId`** en el body de `POST /ai/chat` (y en `POST /ai/chat/stream` si usas streaming).

```json
{
  "sessionId": "uuid-o-id-estable",
  "message": "Hola",
  "history": [],
  "selectedProposal": null,
  "attachedContent": null
}
```

- **`sessionId`**: Identificador estable de la conversación.
  - Genera uno al iniciar un nuevo chat (por ejemplo `crypto.randomUUID()`).
  - Guárdalo en estado (React/Vue/etc.) o en `localStorage` bajo una key tipo `mytsyy_chat_session_id`.
  - Si el usuario está logueado, puedes usar el mismo `sessionId` durante toda la sesión o crear uno por “nueva idea” (botón “Nueva conversación”).
  - Mismo `sessionId` = misma memoria y mismo progreso en el backend.

- **`history`**: Sigue enviando el historial de mensajes (user + assistant) como hasta ahora. El backend lo usa para contexto y para extraer contexto; la memoria estructurada está en Redis/DB, pero el history ayuda al LLM.

- **`selectedProposal`**: Cuando el usuario elige una propuesta (card “Seleccionar proyecto” / “Continuar”), envía en el **siguiente** mensaje el objeto elegido, por ejemplo:
  ```json
  "selectedProposal": { "title": "...", "pitch": "...", "whyItWins": "..." }
  ```
  Así el backend pasa a EXECUTION y devuelve el roadmap.

Si **no** envías `sessionId`, el backend usa el flujo legacy (sin estado, sin progreso guardado).

---

## 2. Qué viene en la respuesta (agente estratégico)

Cuando envías `sessionId`, la respuesta incluye campos nuevos además de los que ya usas.

### Campos que ya conoces

- `data.mode`: `"exploration"` | `"proposal"` | `"execution"`
- `data.reply`: texto del asistente
- `data.questions`: array de preguntas (máx 1–2; suele usar solo `data.questions[0]`)
- `data.proposals`, `data.roadmap`, `data.selectedProject`, `data.introMessage`, `data.frontendHint`

### Campos nuevos (agente estratégico)

| Campo | Tipo | Uso en frontend |
|-------|------|------------------|
| `data.conversationState` | string | Estado real: `GREETING`, `EXPLORATION`, `CLARIFICATION`, `DEFINITION`, `STRATEGY`, `EXECUTION`, `COMPLETED`. Útil para no mostrar CTAs que no aplican (ej. no mostrar “Crear proyecto” en EXPLORATION). |
| `data.businessContext` | objeto | Lo que el backend ya “sabe” del negocio: `idea`, `target`, `productType`, `monetization`, `differentiation`, etc. Puedes mostrar un resumen o checklist (“Ya tenemos: idea, cliente…”). |
| `data.completenessScore` | number 0–100 | Progreso de llenado. Ideal para barra o indicador (ej. “Tu idea al 60%”). |

### Cómo mostrar la respuesta

- **Una sola burbuja**: concatena `data.reply` y, si existe, `data.questions[0]` (en la misma burbuja o debajo), como en el flujo actual.
- **Modo proposal (estratégico)**: a veces el backend devuelve una sola “propuesta” (texto de mentor) en lugar de 3 cards. Si `data.proposals` tiene 1 elemento y `data.frontendHint.primaryCTA` es "Continuar", muestra esa card y el CTA “Continuar” (o similar); no exijas siempre 3 cards.
- **Exploration**: no muestres “Crear proyecto” ni roadmap; solo conversación + pregunta.
- **Execution**: muestra `data.introMessage`, `data.selectedProject` y `data.roadmap`; aquí es cuando debes ofrecer **guardar el proyecto** (ver siguiente sección).

---

## 3. Cuándo crear el proyecto en la base de datos

No hace falta ninguna tabla nueva para esto. Cuando la respuesta sea **modo execution** y tengas roadmap + proyecto:

1. Toma de la respuesta:
   - `data.selectedProject.title`
   - `data.selectedProject.description`
   - `data.roadmap.weeks` (array de `{ week, goals, actions }`)
   - Opcional: `data.introMessage`, y si hay propuesta elegida su `pitch` y `whyItWins`.

2. Si el usuario está **logueado**, llama a **`POST /projects`** (con JWT) con un body como:

```json
{
  "title": "data.selectedProject.title",
  "description": "data.selectedProject.description",
  "source": "chat",
  "pitch": "…",
  "whyItWins": "…",
  "introMessage": "data.introMessage",
  "roadmapWeeks": [
    { "week": 1, "goals": ["…"], "actions": ["…"] },
    { "week": 2, "goals": ["…"], "actions": ["…"] },
    { "week": 3, "goals": ["…"], "actions": ["…"] },
    { "week": 4, "goals": ["…"], "actions": ["…"] }
  ]
}
```

3. Tras crear el proyecto, puedes:
   - Redirigir a la vista del proyecto (roadmap, progreso), o
   - Mostrar un mensaje tipo “Proyecto guardado” y un enlace a “Ver mis proyectos”.

Si el usuario **no** está logueado, puedes mostrar el roadmap igual y un CTA “Regístrate o inicia sesión para guardar este plan”.

---

## 4. Resumen rápido para el frontend

1. **Generar y mantener `sessionId`** por conversación (o por “nueva idea”) y enviarlo en cada `POST /ai/chat`.
2. **Seguir enviando `history`** en cada request.
3. **Al elegir una propuesta**, enviar en el siguiente mensaje `selectedProposal` con el objeto elegido.
4. **Mostrar** `reply` + `questions[0]` en una burbuja; soportar 1 o 3 cards en `proposal`; usar `conversationState` y `completenessScore` para progreso y CTAs.
5. **Cuando `mode === 'execution'`**, construir el payload de `POST /projects` desde `selectedProject` + `roadmap` y llamar a crear proyecto si el usuario está logueado.

Con esto el frontend aprovecha memoria, progreso y flujo estratégico sin necesidad de tablas nuevas. Las tablas opcionales siguientes sirven para listar conversaciones o persistir sesiones en DB (por si quieres “Mis conversaciones” o que el backend use DB además de Redis).
