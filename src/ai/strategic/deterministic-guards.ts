import type { BusinessContext } from './interfaces/conversation-state.interface';
import type { PersistentSession } from './interfaces/session.interface';

/** Patrones técnicos que no deben mostrarse al usuario en reply. */
const TECHNICAL_PATTERNS = [
  /\bidea\s*:\s*/gi,
  /\btarget\s*:\s*/gi,
  /\bproductType\s*:\s*/gi,
  /\bmonetization\s*:\s*/gi,
  /\bdifferentiation\s*:\s*/gi,
  /\bniche\s*:\s*/gi,
  /\bchannels\s*:\s*/gi,
  /\bbrandPositioning\s*:\s*/gi,
  /\bmaturityLevel\s*:\s*/gi,
];

/** Mapeo semántico: si la pregunta contiene estas claves → campo relacionado. */
const QUESTION_TO_FIELD: { pattern: RegExp; field: keyof BusinessContext }[] = [
  { pattern: /\b(cliente|dirigirte|dirigido|a quién|público|comprador|usuario|para quién|a quién le venderías)\b/i, field: 'target' },
  { pattern: /\b(idea|negocio|proyecto|emprendimiento|qué quieres)\b/i, field: 'idea' },
  { pattern: /\b(producto|tipo de producto|servicio|ecommerce|app|plataforma)\b/i, field: 'productType' },
  { pattern: /\b(monetiz|precio|ganar dinero|ingreso|venta|suscripción|cómo ganarías dinero)\b/i, field: 'monetization' },
  { pattern: /\b(diferencia|competencia|ventaja|único|diferenciar)\b/i, field: 'differentiation' },
  { pattern: /\b(nicho|segmento)\b/i, field: 'niche' },
  { pattern: /\b(canal|redes|instagram|tienda online)\b/i, field: 'channels' },
  { pattern: /\b(posicionamiento|marca)\b/i, field: 'brandPositioning' },
  { pattern: /\b(etapa|madurez|fase del proyecto)\b/i, field: 'maturityLevel' },
];

export function isFieldAlreadyDefined(
  fieldKey: keyof BusinessContext,
  session: PersistentSession,
): boolean {
  const value = session.businessContext[fieldKey];
  return value != null && String(value).trim() !== '';
}

/**
 * Indica si la pregunta está relacionada con un campo ya definido en la sesión.
 */
export function isQuestionAboutDefinedField(
  question: string,
  session: PersistentSession,
): boolean {
  const field = getFieldFromQuestion(question);
  if (!field) return false;
  return isFieldAlreadyDefined(field, session);
}

/**
 * Mapeo semántico básico: pregunta → campo de businessContext.
 */
export function getFieldFromQuestion(question: string): keyof BusinessContext | null {
  const normalized = question.trim();
  if (!normalized) return null;
  for (const { pattern, field } of QUESTION_TO_FIELD) {
    if (pattern.test(normalized)) return field;
  }
  return null;
}

/**
 * Normaliza texto para comparaciones más robustas (ignora puntuación y mayúsculas).
 */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpia patrones técnicos visibles del texto (idea:, target:, etc.).
 * Evita espacios huérfanos y colapsa newlines múltiples.
 */
function stripTechnicalPatterns(text: string): string {
  let out = text;
  for (const re of TECHNICAL_PATTERNS) {
    out = out.replace(re, '');
    out = out.replace(/^\s+|\s+$/g, '');
  }
  out = out.replace(/\n\s*\n\s*\n/g, '\n\n');
  return out.replace(/^\s+|\s+$/g, '').trim();
}

export interface DeterministicGuardsResult {
  reply: string;
  questions: string[];
}

/**
 * Validaciones determinísticas antes del self-check LLM.
 * 1. Eliminar preguntas duplicadas en el array.
 * 2. Si questions.length > 1 → dejar solo la primera.
 * 3. Si reply ya incluye la misma pregunta → vaciar questions.
 * 4. Si una pregunta ya está en session.askedQuestions → eliminarla.
 * 5. Si la pregunta es sobre un campo ya definido en businessContext → eliminarla.
 * 6. Limpiar patrones técnicos del reply.
 */
export function applyDeterministicGuards(
  reply: string,
  questions: string[],
  session: PersistentSession,
): DeterministicGuardsResult {
  let guardReply = reply ? stripTechnicalPatterns(reply) : reply;
  let guardQuestions = [...new Set(questions)].filter(Boolean);

  if (guardQuestions.length > 1) {
    guardQuestions = [guardQuestions[0]];
  }

  const askedSet = new Set(
    session.askedQuestions.map((q) => normalizeForCompare(q)),
  );
  const normalizedReply = guardReply ? normalizeForCompare(guardReply) : '';

  guardQuestions = guardQuestions.filter((q) => {
    const trimmed = q.trim();
    if (!trimmed) return false;
    if (
      normalizedReply &&
      normalizedReply.includes(normalizeForCompare(trimmed))
    ) {
      return false;
    }
    if (askedSet.has(normalizeForCompare(trimmed))) return false;
    if (isQuestionAboutDefinedField(trimmed, session)) return false;
    return true;
  });

  if (guardQuestions.length > 1) {
    guardQuestions = [guardQuestions[0]];
  }

  if (
    guardQuestions.length === 1 &&
    normalizedReply &&
    normalizedReply.includes(normalizeForCompare(guardQuestions[0]))
  ) {
    guardQuestions = [];
  }

  return { reply: guardReply, questions: guardQuestions };
}
