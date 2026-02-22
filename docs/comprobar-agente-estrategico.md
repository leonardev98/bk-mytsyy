# Cómo comprobar que el agente estratégico funciona

## 1. Tienes que enviar `sessionId`

Si **no** envías `sessionId`, el backend usa el flujo antiguo (sin Redis, sin state machine).  
Para probar las mejoras, **siempre** incluye `sessionId` en el body.

---

## 2. Prueba con curl (terminal)

Ajusta la URL si tu backend usa otro puerto (por defecto 8080).

### Primera llamada (saludo)

```bash
curl -X POST http://localhost:8080/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "message": "Hola",
    "history": []
  }'
```

**Qué revisar en la respuesta:**

- `data.conversationState`: debe aparecer (ej. `"GREETING"` o `"EXPLORATION"`).
- `data.completenessScore`: número 0–100 (ej. `0` al inicio).
- `data.reply`: mensaje del asistente.
- `data.questions`: puede traer una pregunta (máx 1–2).

Si ves `conversationState` y `completenessScore`, el agente estratégico está activo.

### Segunda llamada (dar idea, mismo sessionId)

```bash
curl -X POST http://localhost:8080/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "message": "Quiero hacer un ecommerce de ropa para perritos",
    "history": [
      {"role": "user", "content": "Hola"},
      {"role": "assistant", "content": "Cuando quieras, cuéntame..."},
      {"role": "user", "content": "Quiero hacer un ecommerce de ropa para perritos"}
    ]
  }'
```

**Qué revisar:**

- `data.businessContext`: debería empezar a rellenarse (ej. `idea` con algo relacionado con ecommerce/ropa perritos).
- `data.completenessScore`: debería subir (ej. 20 si ya tiene `idea`).
- `data.conversationState`: por ejemplo `"EXPLORATION"`.
- La respuesta no debería repetir “¿Qué quieres hacer?”; debería ir a otra pregunta (ej. target o tipo de producto).

### Tercera llamada (mismo sessionId, más contexto)

```bash
curl -X POST http://localhost:8080/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "message": "Para dueños de mascotas, ropa de días especiales como Halloween",
    "history": [
      {"role": "user", "content": "Hola"},
      {"role": "assistant", "content": "..."},
      {"role": "user", "content": "Quiero hacer un ecommerce de ropa para perritos"},
      {"role": "assistant", "content": "..."},
      {"role": "user", "content": "Para dueños de mascotas, ropa de días especiales como Halloween"}
    ]
  }'
```

**Qué revisar:**

- `data.businessContext`: más campos con valor (`target`, `productType`, etc.).
- `data.completenessScore`: mayor (60, 80, etc.).
- Si el score es alto, puede pasar a `conversationState: "STRATEGY"` o `"DEFINITION"` y cambiar el tipo de respuesta (menos preguntas, más propuesta).

---

## 3. Comprobar que Redis guarda la sesión

Con Redis en marcha (Docker) y `REDIS_URL` en `.env`:

```bash
docker exec -it bk-mytsyy-redis redis-cli KEYS "session:*"
```

Deberías ver al menos una key, por ejemplo `session:test-session-001`.  
Si ves keys después de usar el chat con `sessionId`, Redis está guardando la sesión.

Para ver el contenido (opcional):

```bash
docker exec -it bk-mytsyy-redis redis-cli GET "session:test-session-001"
```

Deberías ver un JSON con `state`, `businessContext`, `completenessScore`, etc.

---

## 4. Resumen: checklist rápido

| Comprobación | Cómo |
|--------------|------|
| Agente estratégico activo | Respuesta incluye `conversationState` y `completenessScore`. |
| Mismo sessionId = memoria | Varias llamadas con el mismo `sessionId`; `businessContext` y `completenessScore` evolucionan. |
| No repite preguntas | En 2ª y 3ª respuesta no pregunta de nuevo “¿Qué quieres hacer?” ni lo mismo que ya respondiste. |
| Redis guarda sesión | `docker exec ... redis-cli KEYS "session:*"` devuelve keys después de chatear con `sessionId`. |

Si todo eso se cumple, las mejoras están funcionando.
