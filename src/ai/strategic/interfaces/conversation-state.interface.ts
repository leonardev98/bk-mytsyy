/**
 * Estado explícito de la conversación. No se infiere solo por texto.
 */
export type ConversationPhase =
  | 'GREETING'
  | 'EXPLORATION'
  | 'CLARIFICATION'
  | 'DEFINITION'
  | 'STRATEGY'
  | 'EXECUTION'
  | 'COMPLETED';

/**
 * Contexto de negocio estructurado. Campos rellenados progresivamente.
 */
export interface BusinessContext {
  idea: string | null;
  target: string | null;
  niche: string | null;
  productType: string | null;
  monetization: string | null;
  differentiation: string | null;
  channels: string | null;
  brandPositioning: string | null;
  maturityLevel: string | null;
}

/**
 * Campos obligatorios para el cálculo de completeness score (20 pts cada uno).
 */
export const REQUIRED_CONTEXT_FIELDS: (keyof BusinessContext)[] = [
  'idea',
  'target',
  'productType',
  'monetization',
  'differentiation',
];

/**
 * Prioridad de campos para el motor de preguntas (orden de llenado sugerido).
 */
export const CONTEXT_FIELD_PRIORITY: (keyof BusinessContext)[] = [
  'idea',
  'target',
  'productType',
  'monetization',
  'differentiation',
  'niche',
  'channels',
  'brandPositioning',
  'maturityLevel',
];

export function createEmptyBusinessContext(): BusinessContext {
  return {
    idea: null,
    target: null,
    niche: null,
    productType: null,
    monetization: null,
    differentiation: null,
    channels: null,
    brandPositioning: null,
    maturityLevel: null,
  };
}
