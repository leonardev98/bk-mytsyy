# Base de datos compartida en la nube (mismos datos para todos)

Para que tú y tu compañero uséis **la misma** base de datos (mismos usuarios, mismos proyectos, etc.) tiene que estar **en internet**, no en tu PC. Así todos se conectan al mismo sitio.

## Opciones gratuitas (PostgreSQL en la nube)

| Servicio   | Qué es        | Plan gratis |
|-----------|----------------|-------------|
| **Supabase** | PostgreSQL + extras | 500 MB, 2 proyectos |
| **Neon**     | Solo PostgreSQL   | 512 MB, ilimitado tiempo |
| **Railway**  | PostgreSQL (y más) | ~5 USD/mes de crédito gratis |

Recomendación: **Supabase** o **Neon** para empezar.

---

## Pasos generales (ejemplo con Supabase)

### 1. Crear la base de datos en la nube

1. Entra en [supabase.com](https://supabase.com) (o [neon.tech](https://neon.tech)) y crea una cuenta.
2. Crea un **nuevo proyecto** (en Supabase: New Project → nombre, contraseña de la BD, región).
3. En el panel del proyecto, abre **Settings → Database** (o en Neon: Connection string).
4. Copia la **connection string** o estos datos:
   - **Host** (ej: `db.xxxxx.supabase.co`)
   - **Port** (normalmente `5432`)
   - **User** (ej: `postgres`)
   - **Password** (la que pusiste al crear el proyecto)
   - **Database** (ej: `postgres` en Supabase; en Neon suele ser el nombre del proyecto)

### 2. Configurar el backend para usar esa BD

En tu `.env` (y en el de tu compañero) usáis **la misma** configuración, pero apuntando al host de la nube:

```env
# Base de datos compartida (Supabase/Neon)
POSTGRES_HOST=db.xxxxxxxxxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=la-contraseña-del-proyecto
POSTGRES_DB=postgres
```

- **POSTGRES_HOST**: el host que te da Supabase/Neon (no `localhost`).
- **POSTGRES_DB**: en Supabase suele ser `postgres`; en Neon suele ser el nombre de tu proyecto.

Así, quien tenga este `.env` se conecta a la **misma** BD en la nube → mismos datos para todos.

### 3. Crear las tablas en la BD de la nube

La BD en la nube empieza vacía. Hay que crear el esquema:

1. Conéctate con un cliente (DBeaver, pgAdmin o la consola SQL del propio Supabase/Neon).
2. Usa el **connection string** o host/user/password/database del paso 1.
3. Ejecuta en orden los SQL del repo:
   - `docs/sql/001_create_users.sql`
   - `docs/sql/002_create_projects_roadmap_progress.sql`
   - `docs/sql/003_add_project_cover_image.sql`

En **Supabase** puedes pegar y ejecutar esos SQL en **SQL Editor**. En **Neon**, desde su consola o desde DBeaver/pgAdmin conectando a la BD.

### 4. (Opcional) Llevar tus datos actuales de local a la nube

Si ya tienes datos en tu Postgres local (Docker) y quieres que la BD compartida empiece con esos datos:

**En tu PC (con Docker y la BD local levantada):**

```bash
docker exec bk-mytsyy-postgres pg_dump -U postgres mytsyy > backup_mytsyy.sql
```

**Subir ese backup a la BD en la nube:**

- Con **psql** (instalado o con Docker):
  ```bash
  psql "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres" -f backup_mytsyy.sql
  ```
- O en **Supabase**: SQL Editor → pegar el contenido de `backup_mytsyy.sql` (puede haber que ajustar si hay conflictos con extensiones; si falla, usar `psql`).

Después de esto, la BD en la nube tiene tus tablas y tus datos, y tu compañero al usar el mismo `.env` verá lo mismo.

---

## Resumen

| Qué quieres              | Cómo hacerlo |
|--------------------------|--------------|
| Misma BD para todos      | BD en la nube (Supabase/Neon) |
| Que “cualquiera” la use   | Compartes el `.env` (o solo host/user/password/db) con quien quieras que acceda |
| No instalar Docker para la BD | Correcto: la BD está en internet, solo hace falta el connection string en `.env` |

**Importante:** no subas el `.env` al repo (debe estar en `.gitignore`). Comparte los datos de conexión por un canal seguro (ej. mensaje privado, 1Password, etc.) y que cada uno los ponga en su propio `.env`.

Si quieres, el siguiente paso puede ser un ejemplo concreto solo para Neon o solo para Supabase (paso a paso con capturas).
