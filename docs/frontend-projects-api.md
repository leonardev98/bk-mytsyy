# API de proyectos y progreso (frontend)

Todos los endpoints requieren **JWT** en el header:

```
Authorization: Bearer <access_token>
```

Base URL: la misma del backend (ej. `http://localhost:8080`).

---

## 1. Crear proyecto

Cuando el usuario ve el modo **execution** (roadmap 30 días) —ya sea por elegir una propuesta o por subir documento— el frontend debe llamar a este endpoint para guardar el proyecto y su roadmap.

```
POST /projects
Content-Type: application/json
```

**Body:**

```json
{
  "title": "Marketplace de comercios locales",
  "description": "Una plaza digital donde barrios compran y venden con un clic.",
  "source": "chat",
  "pitch": "Una plaza digital donde barrios compran y venden con un clic.",
  "whyItWins": "Escalable por ciudad, comisión por transacción.",
  "introMessage": "He leído tu proyecto. Aquí tienes tu plan para los primeros 30 días.",
  "roadmapWeeks": [
    { "week": 1, "goals": ["Definir oferta"], "actions": ["Escribir propuesta de valor"] },
    { "week": 2, "goals": ["Crear landing"], "actions": ["Diseñar y publicar página"] },
    { "week": 3, "goals": ["Optimizar pitch"], "actions": ["A/B test mensajes"] },
    { "week": 4, "goals": ["Medir tracción"], "actions": ["Revisar métricas y decidir pivot"] }
  ]
}
```

| Campo           | Tipo     | Requerido | Descripción |
|----------------|----------|-----------|-------------|
| `title`        | string   | sí        | Título del proyecto (máx 500). |
| `description`  | string   | no        | Descripción (ej. de `selectedProject.description`). |
| `source`       | string   | no        | `"chat"` (eligió una propuesta) o `"document"` (subió PDF/Word/TXT). Default `"chat"`. |
| `pitch`        | string   | no        | Pitch corto (cuando viene de propuesta). |
| `whyItWins`    | string   | no        | Por qué gana (cuando viene de propuesta). |
| `introMessage` | string   | no        | Mensaje corto del asistente (ej. "He leído tu proyecto..."). |
| `roadmapWeeks` | array    | sí        | 1–4 elementos con `week`, `goals[]`, `actions[]`. |

**Respuesta 201:** objeto del proyecto creado, con `id`, `userId`, `title`, `description`, `source`, `pitch`, `whyItWins`, `introMessage`, `status`, `createdAt`, `updatedAt`, y relación `roadmap` con `weeks` (cada semana con `weekNumber`, `goals`, `actions`).

---

## 2. Listar mis proyectos

Para la vista "Mis proyectos" o dashboard.

```
GET /projects
```

**Respuesta 200:** array de proyectos del usuario, ordenados por `updatedAt` descendente. Cada ítem incluye:

- Datos del proyecto (`id`, `title`, `description`, `source`, `status`, `createdAt`, `updatedAt`, etc.).
- `roadmap` con `weeks` (objetivos y acciones por semana).
- `lastProgress`: último registro de progreso (si existe): `entryDate`, `content`, `progressPercent`, `createdAt`; si no hay ninguno, `lastProgress` es `null`.

---

## 3. Ver un proyecto

Para entrar a un proyecto y ver detalle + roadmap + historial de progreso.

```
GET /projects/:id
```

**Respuesta 200:** proyecto con `roadmap.weeks`. Para el historial de progreso usar `GET /projects/:id/progress`.

**404** si el proyecto no existe; **403** si no es del usuario.

---

## 4. Añadir entrada de progreso

Registro diario (o cuando el usuario guarde avance).

```
POST /projects/:id/progress
Content-Type: application/json
```

**Body:**

```json
{
  "entryDate": "2025-02-20",
  "content": "Definí la propuesta de valor y empecé el landing.",
  "progressPercent": 15
}
```

| Campo            | Tipo   | Requerido | Descripción |
|------------------|--------|-----------|-------------|
| `entryDate`      | string | sí        | Fecha en formato ISO date (YYYY-MM-DD). |
| `content`        | string | no        | Notas o resumen de lo hecho. |
| `progressPercent`| number | no        | 0–100. |

**Respuesta 201:** entrada creada (`id`, `projectId`, `entryDate`, `content`, `progressPercent`, `createdAt`).

---

## 5. Listar progreso de un proyecto

Para mostrar historial de avances en la vista del proyecto.

```
GET /projects/:id/progress
```

**Respuesta 200:** array de entradas de progreso, ordenadas por `entryDate` y `createdAt` descendente (máx 100).

---

## 6. Actualizar estado del proyecto

Opcional: marcar como pausado o completado.

```
PATCH /projects/:id/status
Content-Type: application/json
```

**Body:**

```json
{ "status": "active" }
```

Valores permitidos: `draft`, `active`, `paused`, `completed`.

**Respuesta 200:** proyecto actualizado con `roadmap`.

---

## Flujo recomendado en el frontend

1. **Chat / documento**  
   Usuario termina en modo **execution** (ve `selectedProject` y `roadmap.weeks`).

2. **Crear proyecto**  
   Al pulsar "Crear proyecto" o "Añadir a dashboard", llamar a `POST /projects` con:
   - `title` ← `data.selectedProject.title`
   - `description` ← `data.selectedProject.description`
   - `source` ← `"document"` si hubo `attachedContent`, si no `"chat"`
   - `pitch` / `whyItWins` ← solo si vino de propuesta (opcional)
   - `introMessage` ← `data.introMessage` si existe
   - `roadmapWeeks` ← `data.roadmap.weeks` mapeando `week` → `week`, `goals`, `actions`

3. **Listado**  
   En "Mis proyectos", usar `GET /projects` y mostrar cada proyecto con `lastProgress` para indicar cómo va.

4. **Detalle**  
   Al entrar a un proyecto: `GET /projects/:id` para título, descripción y roadmap; `GET /projects/:id/progress` para el historial de avances.

5. **Guardar avance**  
   Botón o formulario "Registrar avance": `POST /projects/:id/progress` con `entryDate` (hoy o la fecha que elija), `content` y opcionalmente `progressPercent`.

Con esto cada usuario tiene su lista de proyectos y, al entrar, ve la info del plan de 30 días y cómo va progresando.
