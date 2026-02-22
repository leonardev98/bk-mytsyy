import type { ConversationPhase } from './conversation-state.interface';

/**
 * Respuesta del agente estratégico (compatible con frontend existente + campos nuevos).
 */
export interface StrategicChatResponse {
  /** Estado actual de la conversación. */
  conversationState: ConversationPhase;
  /** Mensaje del asistente (síntesis, insight, propuesta, etc.). */
  reply: string;
  /** Máximo 1–2 preguntas por turno; vacío si no hay o si estamos en STRATEGY/EXECUTION. */
  questions: string[];
  /** Score 0–100 para progreso en UI. businessContext no se expone al frontend (solo interno). */
  completenessScore?: number;
  /** Modo legacy para compatibilidad con frontend que espera exploration | proposal | execution. */
  mode: 'exploration' | 'proposal' | 'execution';
  /** Si se devuelven propuestas (modo proposal/STRATEGY). */
  proposals?: Array<{ title: string; pitch: string; whyItWins: string }>;
  /** Si se devuelve roadmap (modo execution). */
  roadmap?: { weeks: Array<{ week: number; goals: string[]; actions: string[] }> };
  selectedProject?: { title: string; description: string };
  introMessage?: string;
  frontendHint?: { display: 'cards'; cardCount: number; primaryCTA: string };
}
