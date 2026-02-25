/**
 * Genera un username no vacío para perfil público.
 * Si hay username lo usa; si no, fallback desde name o id para que
 * GET /users/:id y el feed devuelvan el mismo valor y el frontend pueda
 * redirigir a /profile/:username.
 */
export function publicUsername(
  data: { username?: string | null; name?: string | null; id: string },
): string {
  if (data.username != null && data.username.trim() !== '') {
    return data.username.trim();
  }
  const slug = (data.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (slug.length > 0) {
    return slug.slice(0, 80);
  }
  return 'u-' + data.id.replace(/-/g, '').slice(0, 8);
}
