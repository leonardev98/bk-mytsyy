# Prompt para el frontend: chat conversacional

Usa estas instrucciones en el frontend para que el chat se sienta **natural y no robótico**. El backend ya responde como un coach: puede charlar, reaccionar y orientar con preguntas clave sin interrogatorios.

---

## 1. No uses preguntas fijas

- **No** muestres una lista de preguntas predefinidas (“¿Cuál es tu idea?”, “¿Quién es tu cliente?”, etc.).
- **No** repitas el mismo texto de bienvenida que luego envía el API (evita duplicados).
- El contenido del asistente debe venir **solo** de la API (`/ai/chat` o `/ai/chat/stream`), salvo el primer mensaje inicial (ver abajo).

---

## 2. Mensaje inicial (bienvenida)

Un único mensaje corto y humano al abrir el chat, por ejemplo:

- **Texto sugerido:**  
  `Hola 👋 Cuando quieras, cuéntame en qué andas o qué te gustaría crear.`

- No incluyas aquí las “preguntas cruciales”; el backend las irá introduciendo cuando tenga sentido en la conversación.

---

## 3. Cómo mostrar la respuesta en modo `exploration`

En modo `exploration`, la API puede devolver:

- `reply`: mensaje conversacional (saludo, reacción, pequeño talk).
- `questions`: array con **como mucho una** pregunta guía (la “pregunta crucial” de ese turno). Puede venir vacío si el turno es solo conversación.

**Regla de visualización:**

- Construye **una sola burbuja** de asistente así:
  - Si existe `data.reply`, muéstralo.
  - Si además `data.questions` tiene al menos un elemento, muestra después (misma burbuja o línea siguiente) `data.questions[0]`.
- Si solo viene `data.questions[0]` (sin `reply`), muestra solo esa pregunta.
- Si solo viene `data.reply` (sin preguntas), muestra solo el reply. Así el usuario puede “solo hablar” sin que siempre haya una pregunta debajo.

**Ejemplo:**

- API devuelve:  
  `{ "mode": "exploration", "reply": "Mola lo de las zapatillas.", "questions": ["¿A quién se las quieres vender?"] }`  
  → Mostrar: “Mola lo de las zapatillas. ¿A quién se las quieres vender?”

- API devuelve:  
  `{ "mode": "exploration", "reply": "¡Hola! Qué bien que estés por aquí.", "questions": [] }`  
  → Mostrar solo: “¡Hola! Qué bien que estés por aquí.”

---

## 4. Un mensaje de asistente por respuesta del API

- Por cada respuesta del API, añade **un solo** mensaje de asistente al hilo.
- Una sola llamada a `POST /ai/chat` (o un solo flujo de `/ai/chat/stream`) por mensaje de usuario (evitar doble envío por doble clic o efectos duplicados).

---

## 5. Flujo con documento adjunto (proyecto ya definido)

**Casuística:** El usuario puede subir un archivo (PDF, TXT o Word) con su idea o proyecto ya escrito. En ese caso **no** debe ver preguntas de exploración ni las 3 propuestas: espera que el sistema tome su proyecto y le devuelva **directamente un cronograma de los primeros 30 días**.

**Qué hace el frontend:**

1. **Permitir adjuntar archivo** (PDF, .txt, .doc/.docx). Opcional: botón “Subir mi proyecto” o adjuntar en el input.
2. **Extraer el texto** del archivo en cliente (o con un servicio que devuelva texto). Para PDF/DOCX puedes usar librerías del navegador o un endpoint propio de extracción; el chat solo recibe texto.
3. **Enviar en el mismo request** que el mensaje del usuario:
   - `message`: por ejemplo `"Aquí está mi proyecto"` o `"Te adjunto mi idea"`.
   - `attachedContent`: **string** con todo el texto extraído del documento (máx. 50.000 caracteres).
4. **No enviar** `selectedProposal` en este flujo.

**Qué devuelve el backend:**

- Con `attachedContent` presente y con contenido, el backend **omite** exploration y proposal y responde en modo **`execution`**:
  - `introMessage` (opcional): frase corta tipo “He leído tu proyecto. Aquí tienes tu plan para los primeros 30 días.”
  - `selectedProject`: { title, description } resumido desde el documento.
  - `roadmap`: 4 semanas (primeros 30 días) con objetivos y acciones por semana.

**Cómo mostrarlo:**

- Mostrar **una burbuja de asistente** con:
  1. Si existe `data.introMessage`, mostrarlo primero.
  2. Luego el **proyecto** (`data.selectedProject.title` y `data.selectedProject.description`).
  3. Luego el **cronograma** (`data.roadmap.weeks`: por cada semana, goals y actions).

No mostrar en este flujo las 3 cards de propuestas ni preguntas de exploración; el usuario ya trajo su idea en el archivo.

---

## 6. Resumen

| Qué | Cómo |
|-----|------|
| Preguntas fijas | No usar; todo viene del API. |
| Bienvenida inicial | Una frase corta y abierta (ej. “Hola 👋 Cuando quieras, cuéntame…”). |
| Exploration | Mostrar `reply` (si existe) y, si viene, `questions[0]` en la misma burbuja. |
| Mensajes | 1 mensaje de asistente por respuesta del API; 1 request por mensaje de usuario. |
| **Documento adjunto** | Enviar texto en `attachedContent`; mostrar respuesta como **execution** (introMessage + selectedProject + roadmap 30 días). |

Con esto el chat mantiene un tono de **coach**: conversación normal, orientación a las preguntas cruciales cuando hace falta, y **atajo directo a cronograma** cuando el usuario sube su proyecto en PDF/TXT/Word.
