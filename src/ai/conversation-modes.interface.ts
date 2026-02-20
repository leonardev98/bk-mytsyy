/**
 * 3 modos conversacionales: EXPLORATION → PROPOSAL → EXECUTION.
 * Una sola llamada por turno; el modelo detecta el modo según el mensaje y el contexto.
 */

export type ConversationRole = 'user' | 'assistant';

export interface ConversationTurn {
  role: ConversationRole;
  content: string;
}

/** Propuesta en modo PROPOSAL: pitch corto y vendedor. */
export interface ProposalCard {
  title: string;
  pitch: string;
  whyItWins: string;
}

/** Proyecto seleccionado para modo EXECUTION. */
export interface SelectedProject {
  title: string;
  description: string;
}

export interface RoadmapWeek {
  week: number;
  goals: string[];
  actions: string[];
}

/** Modo EXPLORATION: conversación natural + opcionalmente una pregunta guía. */
export interface ExplorationResponse {
  mode: 'exploration';
  /** Respuesta conversacional (saludo, reacción, pequeño talk). Puede incluir ya la pregunta. */
  reply?: string;
  /** Pregunta crucial para orientar al usuario (idea → cliente → problema). Máximo una por turno. */
  questions: string[];
}

/** Modo PROPOSAL: suficiente claridad → 3 propuestas tipo pitch, sin roadmap. */
export interface ProposalResponse {
  mode: 'proposal';
  proposals: ProposalCard[];
  frontendHint: {
    display: 'cards';
    cardCount: 3;
    primaryCTA: string;
  };
}

/** Modo EXECUTION: usuario eligió una propuesta o adjuntó su proyecto → roadmap (primeros 30 días). */
export interface ExecutionResponse {
  mode: 'execution';
  /** Mensaje corto opcional (ej. "He leído tu proyecto. Aquí tienes tu plan para los primeros 30 días."). */
  introMessage?: string;
  selectedProject: SelectedProject;
  roadmap: { weeks: RoadmapWeek[] };
}

export type ChatResponse = ExplorationResponse | ProposalResponse | ExecutionResponse;

export function isExploration(r: ChatResponse): r is ExplorationResponse {
  return r.mode === 'exploration';
}
export function isProposal(r: ChatResponse): r is ProposalResponse {
  return r.mode === 'proposal';
}
export function isExecution(r: ChatResponse): r is ExecutionResponse {
  return r.mode === 'execution';
}
