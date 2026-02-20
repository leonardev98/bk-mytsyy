# Portada de proyecto (cover image) — Backend

**Importante:** En la BD **no se guardan fotos** (los binarios no van en tablas). Solo se guarda la **URL** (o path) en la columna `image_url`. El archivo de la imagen va a un almacenamiento de objetos (p. ej. **Amazon S3**) o a disco; cuando lo integres más adelante, esta doc y el esquema ya están listos para engancharse.

---

## 1. Casuística (por qué en BD)

| Aspecto | Situación actual | Objetivo |
|--------|-------------------|----------|
| **Dónde se guarda** | Solo en `localStorage` por proyecto (clave por `projectId`). | La portada es un dato más del proyecto y vive en el backend (BD + almacenamiento de archivos). |
| **Sincronización** | No se sincroniza entre dispositivos. | Mismo usuario ve la misma portada en cualquier dispositivo. |
| **Límite** | Límite de espacio del navegador (~5 MB total). | Sin depender del límite de `localStorage`. |
| **Persistencia** | Se pierde si se borran datos del navegador. | Persistencia igual que título, descripción y progreso. |
| **Privacidad/permisos** | Implícito en el navegador. | Un solo criterio: solo el dueño del proyecto puede ver/editar la portada. |

**Conclusión:** La portada debe ser un campo del proyecto en el backend (referencia en BD, archivo en disco o almacenamiento de objetos), igual que `title`, `description` y el progreso.

### Cómo encaja la base de datos (resumen profesional)

| Qué | Dónde | Para qué |
|-----|--------|----------|
| **Archivo de la imagen** | Almacenamiento de archivos (disco, S3, etc.) | El binario de la foto. El backend lo guarda al subir y lo sirve por URL. |
| **Referencia a esa imagen** | Tabla `projects`, columna `image_url` | Guardar la URL o path para saber qué imagen mostrar por proyecto. |

Sin la columna en BD no hay forma de saber qué portada tiene cada proyecto; con ella, `GET /projects` y `GET /projects/:id` pueden devolver `imageUrl` y el frontend muestra la misma portada en todos los dispositivos.

- **Migración:** En este repo la columna se añade con la migración **[docs/sql/003_add_project_cover_image.sql](sql/003_add_project_cover_image.sql)** (`ALTER TABLE projects ADD COLUMN image_url ...`). Ejecutarla después de `002_create_projects_roadmap_progress.sql`. Si la BD ya existe, basta con aplicar esa migración; no hace falta tocar el script 002.

---

## 2. Prompt para implementar en el backend (copiar/pegar)

A continuación un prompt listo para usar en el backend. Incluye modelo, endpoints y comportamiento esperado.

---

### Texto del prompt (sección 2)

**A. Modelo y persistencia**

- Añadir al modelo de proyecto el campo `image_url` (string, nullable): URL o path de la imagen de portada del proyecto.
- Si la BD no tiene la columna: ejecutar la migración existente [docs/sql/003_add_project_cover_image.sql](sql/003_add_project_cover_image.sql) o crear una equivalente que añada `image_url` (p. ej. `VARCHAR(500)`) a la tabla `projects`.

**B. Respuestas existentes**

- Incluir `imageUrl` (camelCase en JSON) en la respuesta de:
  - `GET /projects` — en cada elemento del array.
  - `GET /projects/:id` — en el objeto del proyecto.
- Si no hay portada, `imageUrl` debe ser `null`.

**C. Nuevo endpoint: subir/actualizar portada**

- **Ruta:** `PUT /projects/:id/cover` o `PATCH /projects/:id/cover` (o, si se prefiere, `POST /projects/:id/cover`).
- **Comportamiento:**
  - Si el proyecto no existe → **404**.
  - Si el usuario autenticado no es el dueño del proyecto → **403**.
  - Si el usuario es el dueño: aceptar la imagen, guardarla en almacenamiento (disco, S3, etc.), actualizar `image_url` en el proyecto y devolver el proyecto actualizado (con `imageUrl` en la respuesta).
- **Formato de la petición (elegir una opción):**
  - **Opción A:** `Content-Type: multipart/form-data` con un campo de archivo (ej. `file` o `cover`).
  - **Opción B:** `Content-Type: application/json` con un campo que contenga la imagen en base64 (ej. `{ "image": "data:image/jpeg;base64,..." }`).
- **Seguridad:**
  - Validar tipo de archivo (solo imágenes permitidas: JPEG, PNG, WebP, etc.).
  - Validar tamaño (límite razonable, ej. 2–5 MB).
  - No ejecutar el contenido como código; tratar solo como binario de imagen.
- **Respuesta 200:** objeto del proyecto actualizado, incluyendo `imageUrl`.

**D. Opcional: quitar la portada**

- **Ruta:** `DELETE /projects/:id/cover`.
- **Comportamiento:** 404 si no existe el proyecto, 403 si no es el dueño. Si es el dueño: eliminar el archivo de portada (si existe), poner `image_url` a `null` y devolver el proyecto actualizado con `imageUrl: null`.

---

## 3. Uso desde el frontend cuando esté implementado

- **Listado:** En `GET /projects`, cada proyecto incluirá `imageUrl`. El frontend mostrará esa URL como `src` de la portada en tarjetas o listas.
- **Detalle:** En `GET /projects/:id`, el proyecto incluirá `imageUrl` para mostrar la portada en la vista de detalle.
- **Subir/actualizar portada:** El frontend llamará a `PUT` (o `PATCH`/`POST`) `/projects/:id/cover` con la imagen en multipart o en base64 según lo que ofrezca el backend.
- **Quitar portada:** Si el backend implementa `DELETE /projects/:id/cover`, el frontend usará ese endpoint cuando el usuario elija “Quitar portada” y actualizará la UI con el proyecto devuelto (`imageUrl: null`).

Cuando el backend tenga listos los cambios, el frontend dejará de usar `localStorage` para la portada y usará únicamente la API.

---

## 4. Para más adelante: almacenamiento real (S3, etc.)

Cuando quieras guardar las fotos en **Amazon S3** (o MinIO, Cloudflare R2, disco del servidor, etc.), no hace falta cambiar el esquema ni la API. Solo implementas *dónde* se guarda el archivo; la BD sigue guardando solo la URL.

**Checklist para cuando lo hagas:**

1. **Cuenta y bucket**  
   Crear bucket en S3 (o equivalente), políticas de acceso y (si aplica) CDN/URL pública.

2. **Credenciales en el backend**  
   Variables de entorno (ej. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, nombre del bucket). No commitear credenciales.

3. **Subir al subir portada**  
   En el endpoint `PUT/PATCH /projects/:id/cover`: recibir el archivo → subirlo a S3 (clave ej. `covers/{projectId}.jpg`) → obtener la URL pública (o firmada) → guardar **esa URL** en `projects.image_url` → devolver proyecto con `imageUrl`.

4. **Borrar al quitar portada**  
   En `DELETE /projects/:id/cover`: borrar el objeto en S3 correspondiente a ese proyecto (si existe) → poner `image_url` a `null` en BD → devolver proyecto.

5. **Frontend**  
   Sin cambios de contrato: sigue usando `imageUrl` que devuelve la API; esa URL ya apuntará a S3.

La migración 003, el modelo `image_url` y los endpoints descritos en la sección 2 siguen igual; solo cambia el paso interno de “dónde guardo el archivo y qué URL escribo en `image_url`”.
