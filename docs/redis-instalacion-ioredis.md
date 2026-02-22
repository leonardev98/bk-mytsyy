# Instalar ioredis y usar Redis (paso a paso)

Si `npm install` falla con `Cannot read properties of null (reading 'matches')`, sigue estos pasos **en orden**.

---

## Paso 1: Entrar al proyecto

```bash
cd /home/leona/proyects/bk-mytsyy
```

---

## Paso 2: Borrar node_modules y package-lock.json

Esto elimina una instalación previa posiblemente corrupta:

```bash
rm -rf node_modules
rm -f package-lock.json
```

---

## Paso 3: Actualizar npm

Ese error suele venir de versiones antiguas de npm:

```bash
npm install -g npm@latest
```

Confirma la versión:

```bash
npm -v
```

Deberías tener algo como 10.x o superior.

---

## Paso 4: Limpiar caché de npm

```bash
npm cache clean --force
```

---

## Paso 5: Instalar dependencias

```bash
npm install
```

Si funciona, verás algo como `added XXX packages`. En ese caso ya tienes `ioredis` en `node_modules`.

Para comprobarlo:

```bash
ls node_modules/ioredis
```

Deberías ver el directorio con el paquete.

---

## Paso 6: Levantar Redis con Docker

```bash
docker compose up -d redis
```

---

## Paso 7: Comprobar REDIS_URL en .env

Abre `.env` y verifica que tengas:

```
REDIS_URL=redis://localhost:6379
```

---

## Paso 8: Arrancar el backend

```bash
npm run start:dev
```

Si arranca sin errores y Redis está corriendo, el agente usará Redis para guardar sesiones.

---

## Si npm install sigue fallando

Prueba con **pnpm**:

```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# En el proyecto
cd /home/leona/proyects/bk-mytsyy
rm -rf node_modules
rm -f package-lock.json pnpm-lock.yaml
pnpm install
```

Luego:

```bash
pnpm run start:dev
```

---

## Resumen

| Paso | Comando |
|------|---------|
| 1 | `cd /home/leona/proyects/bk-mytsyy` |
| 2 | `rm -rf node_modules && rm -f package-lock.json` |
| 3 | `npm install -g npm@latest` |
| 4 | `npm cache clean --force` |
| 5 | `npm install` |
| 6 | `docker compose up -d redis` |
| 7 | Verificar `REDIS_URL=redis://localhost:6379` en `.env` |
| 8 | `npm run start:dev` |
