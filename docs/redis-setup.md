# Redis: integración paso a paso

Redis en este proyecto se usa para **guardar la sesión del agente conversacional** (state, businessContext, progreso).  
**No tienes que pagar** para usarlo: puedes correrlo en tu máquina (Docker) o usar un plan gratuito en la nube.

---

## Resumen en 3 pasos (Docker, desarrollo)

1. **Levantar Redis:** en la raíz del proyecto ejecuta  
   `docker compose up -d redis`
2. **Variable de entorno:** en tu `.env` añade  
   `REDIS_URL=redis://localhost:6379`
3. **Dependencias y backend:**  
   `npm install`  
   `npm run start:dev`

Si no tienes Docker, más abajo tienes la opción en la nube (Upstash, gratis).

---

## ¿Tengo que pagar?

**No.** Tienes dos opciones gratis:

1. **Redis en tu PC (Docker)** – Gratis, solo necesitas Docker instalado. Ideal para desarrollo.
2. **Redis en la nube (plan free)** – Gratis con límites (ej. Upstash, Redis Cloud). Ideal para producción o si no usas Docker.

Si **no** configuras Redis, la app sigue funcionando: las sesiones se guardan **en memoria** (se pierden al reiniciar el backend).

---

## Opción A: Redis local con Docker (recomendado para desarrollo)

### 1. Instalar Docker

- **Windows/Mac:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux:** `sudo apt install docker.io docker-compose-plugin` (o equivalente)

Comprueba que funciona:

```bash
docker --version
```

### 2. Levantar Redis en tu proyecto

En la raíz del proyecto (donde está `docker-compose.yml`):

```bash
docker compose up -d redis
```

Eso deja Redis corriendo en el puerto **6379** (por defecto).

### 3. Configurar la URL en `.env`

Abre o crea el archivo `.env` en la raíz del proyecto y añade:

```env
REDIS_URL=redis://localhost:6379
```

Si Redis no tiene contraseña (caso típico en local), esa URL basta.

### 4. Instalar dependencias del backend (si no lo has hecho)

```bash
npm install
```

Así se instala `ioredis`, que usa el backend para conectarse a Redis.

### 5. Arrancar el backend

```bash
npm run start:dev
```

Si en los logs no ves errores de Redis, la conexión está bien. Las sesiones del chat (cuando envías `sessionId`) se guardarán en Redis.

---

## Opción B: Redis en la nube (gratis)

Si no quieres usar Docker o vas a desplegar en un servidor, puedes usar un Redis gestionado con plan free.

### Upstash (recomendado, plan free)

1. Entra en [upstash.com](https://upstash.com) y crea cuenta.
2. Crea una base de datos Redis (elige región cercana).
3. En el panel verás algo como **REST URL** o **Redis URL**. Copia la URL que sea tipo:
   - `rediss://default:XXXXX@us1-xxx.upstash.io:6379`  
   (a veces te dan usuario y contraseña por separado; la URL suele ser `rediss://default:password@host:puerto`).
4. Pega esa URL en tu `.env`:

```env
REDIS_URL=rediss://default:TU_PASSWORD@TU_HOST.upstash.io:6379
```

5. Reinicia el backend. Las sesiones quedarán guardadas en Upstash.

### Redis Cloud (alternativa)

1. [redis.com/try-free](https://redis.com/try-free/) – plan free (30 MB).
2. Crea la base de datos y copia la **Public endpoint** (ej. `redis-12345.c1.us-east-1.redislabs.com:12345`) y la contraseña.
3. En `.env`:

```env
REDIS_URL=redis://default:TU_PASSWORD@redis-12345.c1.us-east-1.redislabs.com:12345
```

---

## Resumen de pasos (checklist)

- [ ] Elegir: **Docker (local)** o **nube (Upstash / Redis Cloud)**.
- [ ] **Si es Docker:**  
  - [ ] Tener Docker instalado.  
  - [ ] Ejecutar `docker compose up -d redis`.  
  - [ ] En `.env`: `REDIS_URL=redis://localhost:6379`.
- [ ] **Si es nube:**  
  - [ ] Crear cuenta y base Redis en Upstash o Redis Cloud.  
  - [ ] Copiar la URL de conexión.  
  - [ ] En `.env`: `REDIS_URL=rediss://...` o `redis://...` (según lo que te den).
- [ ] En la raíz del proyecto: `npm install`.
- [ ] Arrancar backend: `npm run start:dev`.

Cuando `REDIS_URL` está definida y Redis está accesible, el backend usa Redis para las sesiones del agente. Si no pones `REDIS_URL` o Redis no está disponible, la app sigue funcionando con sesiones en memoria.
