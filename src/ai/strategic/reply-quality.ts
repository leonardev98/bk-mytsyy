/** FAST ENTREPRENEUR: máximo 6 líneas en exploración. */
export const MAX_REPLY_LINES = 6;
/** Cuando el reply es bloque de 3 propuestas (1️⃣ 2️⃣ 3️⃣), permitir más líneas. */
const MAX_PROPOSAL_REPLY_LINES = 14;

const CONTEXT_FIELD_PATTERN = /^\s*(idea|target|productType|monetization|differentiation|niche|channels|brandPositioning|maturityLevel)\s*:\s*/im;

/**
 * Aplica regla de claridad: máximo 6 líneas en exploración (FAST ENTREPRENEUR);
 * hasta 14 líneas cuando es bloque de 3 propuestas. Elimina líneas con campos de contexto.
 */
export function enforceClarity(reply: string): string {
  if (!reply?.trim()) return reply;
  let out = reply.trim();
  const lines = out.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const withoutContextLines = lines.filter(
    (line) => !CONTEXT_FIELD_PATTERN.test(line.trim()),
  );
  const isProposalBlock = /1️⃣|¿Cuál te vibra más\?/.test(out);
  const maxLines = isProposalBlock ? MAX_PROPOSAL_REPLY_LINES : MAX_REPLY_LINES;
  const capped = withoutContextLines.slice(0, maxLines);
  return capped.join('\n').trim() || out.split(/\r?\n/).slice(0, maxLines).join('\n').trim();
}
