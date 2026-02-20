# Prompt para el frontend: flujo “proyecto en documento”

Usa este texto para que el frontend (o quien implemente la UI) entienda y implemente el flujo de **usuario que ya tiene su idea en un archivo**.

---

## Casuística

El usuario puede llegar con su proyecto o idea **ya escrita** en un archivo (PDF, TXT o Word). En ese caso:

- **No** debe pasar por preguntas de exploración (“¿Cuál es tu idea?”, “¿Quién es tu cliente?”, etc.).
- **No** debe ver las 3 propuestas para elegir una.
- **Sí** debe recibir **directamente** un plan de **primeros 30 días** (cronograma por semanas) basado en su documento.

Es decir: el sistema detecta “ya tiene su idea definida” y cambia el flujo: en lugar de explorar → 3 opciones → elegir → roadmap, va **directo a roadmap de 30 días** a partir de lo que subió.

---

## Qué tiene que hacer el frontend

1. **Permitir adjuntar archivo**  
   - Formatos: PDF, .txt, .doc / .docx.  
   - UI: botón “Subir mi proyecto” o adjuntar archivo en el chat (icono de clip, etc.).

2. **Obtener el texto del archivo**  
   - En el cliente: usar librerías para extraer texto (PDF.js, FileReader para TXT, mammoth o similar para Word), **o** enviar el archivo a un endpoint que devuelva el texto.  
   - El backend del chat **no recibe el archivo binario**: recibe solo un **string** con el contenido.

3. **Llamar al API del chat con el texto adjunto**  
   - Mismo endpoint que siempre: `POST /ai/chat` (o `/ai/chat/stream`).  
   - Body:
     - `message`: mensaje del usuario, ej. `"Aquí está mi proyecto"` o `"Te adjunto mi idea"`.
     - `attachedContent`: **string** con todo el texto extraído del documento (máx. 50.000 caracteres).
     - `history`: historial de la conversación (como en el flujo normal).
     - No enviar `selectedProposal` en este caso.

4. **Interpretar la respuesta**  
   - Con `attachedContent` enviado, el backend suele responder en modo **`execution`** (no `exploration` ni `proposal`).  
   - La respuesta incluye:
     - `introMessage` (opcional): mensaje corto del asistente, ej. “He leído tu proyecto. Aquí tienes tu plan para los primeros 30 días.”
     - `selectedProject`: { `title`, `description` } del proyecto extraído del documento.
     - `roadmap`: objeto con `weeks` (4 semanas = primeros 30 días); cada semana tiene `goals` y `actions`.

5. **Mostrar en pantalla**  
   - Una sola burbuja (o bloque) de asistente con:
     1. Si existe `introMessage`, mostrarlo arriba.
     2. Título y descripción del proyecto (`selectedProject`).
     3. Cronograma: listar las 4 semanas con sus objetivos y acciones.  
   - **No** mostrar en este flujo las 3 cards de propuestas ni preguntas de exploración.

---

## Resumen para quien implementa

- **Si el usuario sube PDF/TXT/Word con su proyecto:** extraer texto → enviar en `attachedContent` junto con `message` → mostrar la respuesta como **execution** (intro + proyecto + roadmap 30 días).  
- **Si el usuario solo escribe en el chat:** flujo normal (exploration → proposal → execution al elegir una propuesta).

Con esto el frontend entiende la casuística y puede implementar el flujo de “proyecto ya definido” sin preguntas ni 3 opciones, yendo directo al cronograma de 30 días.
