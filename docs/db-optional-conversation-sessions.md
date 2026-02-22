# DB opcional: sesiones de conversación

El agente estratégico **no requiere** tablas nuevas: la memoria vive en Redis (o en memoria si Redis no está).  
Si quieres **persistir sesiones en la base de datos** (listar “Mis conversaciones”, recuperar una sesión, o que el backend lea/esciba sesión en DB), puedes añadir lo siguiente.

---

## 1. Tabla opcional: `conversation_sessions`

Sirve para:

- Asociar una conversación a un usuario (cuando esté logueado).
- Listar conversaciones recientes por usuario.
- Guardar en DB una copia del estado/contexto (por si Redis se pierde o quieres historial largo).

| Columna | Tipo | Descripción |
|--------|------|-------------|
| `id` | UUID PK | Id de la fila (o usar `session_id` como PK). |
| `session_id` | VARCHAR(256) UNIQUE | El mismo `sessionId` que envía el frontend. |
| `user_id` | UUID NULL FK → users | Si el usuario está logueado, asociar aquí. |
| `state` | VARCHAR(32) | GREETING, EXPLORATION, CLARIFICATION, DEFINITION, STRATEGY, EXECUTION, COMPLETED. |
| `business_context` | JSONB | Objeto con idea, target, productType, monetization, differentiation, etc. |
| `completeness_score` | SMALLINT | 0–100. |
| `last_user_message` | TEXT NULL | Último mensaje del usuario (opcional). |
| `updated_at` | TIMESTAMPTZ | Última actualización. |

### SQL (PostgreSQL)

```sql
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(256) NOT NULL UNIQUE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'GREETING',
  business_context JSONB NOT NULL DEFAULT '{}',
  completeness_score SMALLINT NOT NULL DEFAULT 0,
  last_user_message TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_updated_at ON conversation_sessions(updated_at DESC);
```

---

## 2. Cómo usar esta tabla desde el backend

Hoy el backend **no** escribe ni lee esta tabla; todo lo hace con Redis (o memoria). Para usarla tendrías que:

1. **Crear la entidad** en TypeORM (por ejemplo `ConversationSession`) mapeando las columnas de arriba.
2. **En `ConversationService`** (o en un nuevo `ConversationSessionService`):
   - Tras cada turno: si tienes `userId` (ej. desde JWT en el request), hacer upsert en `conversation_sessions` por `session_id`: actualizar `state`, `business_context`, `completeness_score`, `last_user_message`, `updated_at`, y opcionalmente `user_id` si no estaba puesto.
   - Para “listar mis conversaciones”: `GET /conversations` (protegido con JWT) que devuelva las filas de `conversation_sessions` donde `user_id = currentUser.id` ordenadas por `updated_at DESC`.
3. **Opcional**: endpoint para “recuperar sesión” (por ejemplo `GET /conversations/:sessionId`) que devuelva `state`, `business_context`, `completeness_score` para que el frontend muestre resumen o progreso al reabrir un chat.

El frontend no tiene que cambiar: sigue enviando `sessionId`. La diferencia es que, si el backend guarda en esta tabla, podrás mostrar “Mis conversaciones” y asociar sesiones a usuarios.

---

## 3. ¿Hace falta algo más en DB para el agente?

**No.** Para el flujo actual:

- **Chat**: Redis (o memoria) con `sessionId` es suficiente.
- **Proyectos**: ya existen `projects`, `roadmaps`, `roadmap_weeks`, `progress_entries`. El frontend crea el proyecto con `POST /projects` cuando recibe `mode: 'execution'`.

La tabla `conversation_sessions` es **opcional** y solo tiene sentido si quieres:

- Listar conversaciones por usuario.
- Persistir estado/contexto en DB además de (o en lugar de) Redis.
- Recuperar una sesión por `sessionId` desde la API (por ejemplo al reabrir un chat).

Resumen: **no es obligatorio crear más tablas** para aprovechar el agente; solo si quieres que el backend use la DB para sesiones y listados.
