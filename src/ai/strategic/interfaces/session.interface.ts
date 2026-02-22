import {
  createEmptyBusinessContext,
  type BusinessContext,
  type ConversationPhase,
} from './conversation-state.interface';

/**
 * Sesión persistida en Redis.
 * Key: session:{sessionId}
 */
export interface PersistentSession {
  /** Estado explícito de la máquina de estados. */
  state: ConversationPhase;
  /** Contexto de negocio rellenado progresivamente. */
  businessContext: BusinessContext;
  /** 0–100. Calculado a partir de campos obligatorios. */
  completenessScore: number;
  /** Preguntas ya hechas (texto) para log y debugging. */
  askedQuestions: string[];
  /** Embeddings de cada pregunta para anti-redundancia semántica. */
  semanticEmbeddings: number[][];
  /** Última actualización (ISO string). */
  updatedAt: string;
  /** Último mensaje del usuario (opcional, para contexto). */
  lastUserMessage?: string;
  /** Si la última respuesta del asistente fue pregunta o aportó valor (anti-formulario). */
  lastResponseType?: 'question' | 'value';
}

export function createInitialSession(state: ConversationPhase = 'GREETING'): PersistentSession {
  return {
    state,
    businessContext: createEmptyBusinessContext(),
    completenessScore: 0,
    askedQuestions: [],
    semanticEmbeddings: [],
    updatedAt: new Date().toISOString(),
  };
}
