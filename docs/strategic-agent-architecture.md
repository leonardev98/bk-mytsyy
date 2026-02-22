# Arquitectura del agente estratégico conversacional

## 1. Visión general

Sistema de conversación con **estado explícito**, **memoria persistente en Redis**, **scoring de completitud**, **anti-redundancia semántica** y **motor de preguntas dinámico**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AiController (POST /ai/chat)                        │
│  sessionId, message, history?, attachedContent?, selectedProposal?           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ConversationService (orquestador)                       │
│  1. Cargar/crear sesión (Redis)                                               │
│  2. Extraer contexto del mensaje + LLM si hace falta                         │
│  3. Actualizar businessContext + detectar objeciones                         │
│  4. Calcular completenessScore → StateMachine (transición)                    │
│  5. Si EXPLORATION/DEFINITION: QuestioningEngine (1 pregunta, sin repetir)    │
│  6. Si STRATEGY: generar propuesta estratégica (mentor)                        │
│  7. Persistir sesión en Redis                                                 │
│  8. Devolver reply + conversationState + questions (máx 1-2)                 │
└───┬─────────────┬─────────────┬─────────────┬─────────────┬───────────────────┘
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐
│ Redis  │  │ State    │  │ Scoring  │  │ Embedding  │  │ Questioning      │
│ Memory │  │ Machine  │  │ Service  │  │ Service    │  │ Engine           │
└────────┘  └──────────┘  └──────────┘  └────────────┘  └──────────────────┘
```

---

## 2. State machine

| Estado        | Descripción                          | Transiciones salida                    |
|---------------|--------------------------------------|----------------------------------------|
| GREETING      | Saludo inicial                       | → EXPLORATION                          |
| EXPLORATION   | Recoger idea, target, problema       | → CLARIFICATION, DEFINITION            |
| CLARIFICATION | Resolver ambigüedad u objeción       | → EXPLORATION, DEFINITION              |
| DEFINITION    | Definición clara, afinando           | → STRATEGY                             |
| STRATEGY      | Propuesta de valor, posicionamiento  | → EXECUTION                            |
| EXECUTION     | Roadmap / siguientes pasos           | → COMPLETED                            |
| COMPLETED     | Sesión cerrada                       | —                                      |

**Reglas:**
- GREETING → EXPLORATION (siempre tras primer mensaje).
- EXPLORATION → CLARIFICATION si el LLM o la lógica detectan ambigüedad o contradicción.
- EXPLORATION → DEFINITION cuando `completenessScore >= 60`.
- DEFINITION → STRATEGY cuando `completenessScore >= 80`.
- STRATEGY → EXECUTION cuando el usuario “acepta” o pide siguiente paso.
- EXECUTION → COMPLETED cuando se entrega roadmap o el usuario confirma.

El estado **no se infiere solo por texto**: existe un campo explícito `conversationState` persistido en Redis.

---

## 3. Memoria en Redis

**Key:** `session:{sessionId}`  
**TTL (opcional):** ej. 24h o 7 días.

```json
{
  "state": "EXPLORATION",
  "businessContext": {
    "idea": null,
    "target": null,
    "niche": null,
    "productType": null,
    "monetization": null,
    "differentiation": null,
    "channels": null,
    "brandPositioning": null,
    "maturityLevel": null
  },
  "completenessScore": 0,
  "askedQuestions": [],
  "semanticEmbeddings": []
}
```

- `askedQuestions`: strings de preguntas ya hechas (para log).
- `semanticEmbeddings`: vectores (arrays de números) de cada pregunta; se usan para similitud.

Actualización en cada turno. El LLM **no** es la única fuente de verdad: el contexto estructurado vive en Redis.

---

## 4. Vector store para redundancia semántica

- Cada **pregunta generada** se convierte en embedding (OpenAI).
- Se compara con los vectores en `session.semanticEmbeddings`.
- Si `similarity > 0.85` (umbral configurable) → **bloquear** esa pregunta y generar otra (o no preguntar si no hay alternativa útil).
- Evita repetir “¿Quién es tu cliente ideal?” y “¿A quién te gustaría dirigirte?”.

---

## 5. Business completeness score

**Campos obligatorios (cada uno +20):**
- idea  
- target  
- productType  
- monetization  
- differentiation  

**Score máximo:** 100.

**Reglas de fase:**
- Score < 60 → EXPLORATION  
- 60 ≤ Score < 80 → DEFINITION  
- Score ≥ 80 → STRATEGY  

El agente cambia de fase automáticamente según este score (y las transiciones de la state machine).

---

## 6. Dynamic questioning engine

1. Detectar campos **vacíos** en `businessContext`.
2. Ordenar por **prioridad** (idea, target, productType, monetization, differentiation, resto).
3. Generar **1 pregunta** (máx 2 por turno) para el campo más crítico vacío.
4. Validar con **EmbeddingService**: si es semánticamente similar a una ya hecha, bloquear y elegir siguiente campo o reformular.
5. Guardar el embedding de la pregunta en `semanticEmbeddings`.

Antes de preguntar: **resumir** lo entendido, detectar el **vacío real** y preguntar solo sobre eso.

---

## 7. Manejo de objeciones/fricción

- Si el usuario **contradice** o **rechaza** algo ya dicho:
  - Reconocer explícitamente.
  - Ajustar `businessContext` (borrar o actualizar el campo afectado).
  - No insistir en la misma dirección.
  - No generar defensa innecesaria.

Ejemplo: *"Tienes razón, para un ecommerce tradicional la venta directa es el modelo adecuado. Ajustemos sobre esa base."*

---

## 8. Transición a propuesta (STRATEGY)

Cuando `completenessScore >= 80`:

- **No** hacer más preguntas básicas.
- Generar como **mentor estratégico**:
  - Propuesta de valor clara  
  - Posicionamiento estratégico  
  - Ventaja competitiva  
  - Siguiente paso concreto  
  - Stack sugerido si aplica  

Sin formato catálogo; sin “Seleccionar proyecto”. Respuesta en modo mentor senior.

---

## 9. Flujo de un turno (ejemplo)

1. **Request:** `POST /ai/chat` con `sessionId`, `message`, `history`, opcional `attachedContent`.
2. **ConversationService:**
   - `RedisMemoryService.get(sessionId)` → sesión o nueva con estado GREETING/EXPLORATION.
   - Si hay `attachedContent`, extraer datos y rellenar `businessContext`; puede saltar a DEFINITION/STRATEGY.
   - Si no, **LLM (extract)** opcional: del `message` + `history` extraer entidades para rellenar `businessContext` y detectar objeción.
   - **ScoringService.compute(businessContext)** → `completenessScore`.
   - **StateMachineService.transition(currentState, score, payload)** → próximo estado.
   - Si estado = EXPLORATION o DEFINITION:
     - **QuestioningEngine.nextQuestion(context, askedQuestions, embeddings)** → 1 pregunta (o 0 si no hay vacío útil sin repetir).
     - Si hay pregunta, **EmbeddingService.embed(question)** y comprobar similitud; si pasa, añadir a `askedQuestions` y `semanticEmbeddings`.
   - Si estado = STRATEGY: generar respuesta tipo propuesta estratégica (LLM con prompt de mentor).
   - Si estado = EXECUTION: generar roadmap (como hoy).
   - **RedisMemoryService.set(sessionId, session)**.
3. **Response:** `{ conversationState, reply, questions, businessContext?, completenessScore?, ... }`.

---

## 10. Ejemplo de ciclo con estados

| Turno | Usuario              | Estado anterior | Score | Acción                                      | Estado siguiente |
|-------|----------------------|-----------------|-------|---------------------------------------------|------------------|
| 1     | "Hola"               | —               | 0     | Saludo + 1 pregunta (idea)                 | GREETING → EXPLORATION |
| 2     | "Ecommerce ropa perros" | EXPLORATION  | 20    | Síntesis + pregunta (target)               | EXPLORATION      |
| 3     | "Dueños de mascotas" | EXPLORATION     | 40    | Síntesis + pregunta (productType/monetization) | EXPLORATION  |
| 4     | "Ropa días especiales, venta directa" | EXPLORATION | 80 | Sin pregunta; propuesta estratégica        | DEFINITION → STRATEGY |
| 5     | "Sí, la primera"     | STRATEGY       | 80    | Roadmap 30 días                            | STRATEGY → EXECUTION |
| 6     | "Perfecto"           | EXECUTION      | 80    | Cierre                                     | EXECUTION → COMPLETED |

---

## 11. Servicios y responsabilidades

| Servicio              | Responsabilidad |
|-----------------------|------------------|
| ConversationService  | Orquestar turno: Redis, estado, scoring, preguntas, LLM, persistir. |
| StateMachineService  | Transiciones entre GREETING/EXPLORATION/CLARIFICATION/DEFINITION/STRATEGY/EXECUTION/COMPLETED. |
| RedisMemoryService   | GET/SET sesión por `sessionId`; estructura con state, businessContext, score, askedQuestions, semanticEmbeddings. |
| EmbeddingService     | Embedding de texto (OpenAI); similitud entre dos vectores o contra lista de vectores. |
| ScoringService       | Cálculo de completenessScore a partir de businessContext (campos obligatorios 20 pts cada uno). |
| QuestioningEngineService | Dado businessContext, prioridad de campos y lista de preguntas/embeddings ya usados, proponer 1 (o 2) siguiente pregunta no repetida. |

Todos inyectables en NestJS; Redis y OpenAI configurables por env.

---

## 12. Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `OPENAI_API_KEY` | Requerida para LLM y embeddings. |
| `OPENAI_MODEL` | Modelo de chat (default: gpt-4o-mini). |
| `OPENAI_EMBEDDING_MODEL` | Modelo de embeddings (default: text-embedding-3-small). |
| `REDIS_URL` | Opcional. Si no está definida o `ioredis` no está instalado, la sesión se guarda en memoria (fallback en `RedisMemoryService`). |
| `SESSION_TTL_SECONDS` | TTL de la sesión en Redis (default: 7 días). |
| `QUESTION_SIMILARITY_THRESHOLD` | Umbral de similitud para bloquear preguntas repetidas (default: 0.85). |

---

## 13. Uso del API con agente estratégico

Enviar `sessionId` en el body de `POST /ai/chat` para activar el flujo estratégico:

```json
{
  "sessionId": "uuid-o-identificador-estable",
  "message": "Quiero un ecommerce de ropa para perros",
  "history": []
}
```

Si no se envía `sessionId`, se usa el flujo legacy (un solo LLM por turno, sin estado ni Redis).
