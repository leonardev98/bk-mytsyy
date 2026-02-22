import { Injectable } from '@nestjs/common';
import type { ConversationPhase } from './interfaces/conversation-state.interface';

export interface TransitionInput {
  currentState: ConversationPhase;
  completenessScore: number;
  /** Usuario envió contenido adjunto (documento). */
  hasAttachedContent?: boolean;
  /** Usuario eligió una propuesta (aceptó estrategia). */
  userAcceptedProposal?: boolean;
  /** Usuario confirmó cierre o siguiente paso final. */
  userConfirmedComplete?: boolean;
  /** Detección de ambigüedad o contradicción. */
  needsClarification?: boolean;
  /** Frustración o pide ideas → saltar a STRATEGY. */
  forceStrategy?: boolean;
}

/**
 * Máquina de estados explícita. No infiere estado por texto; transiciones por reglas.
 */
@Injectable()
export class StateMachineService {
  /**
   * Calcula el siguiente estado según reglas de negocio.
   */
  transition(input: TransitionInput): ConversationPhase {
    const {
      currentState,
      completenessScore,
      hasAttachedContent,
      userAcceptedProposal,
      userConfirmedComplete,
      needsClarification,
      forceStrategy,
    } = input;

    if (hasAttachedContent && (currentState === 'GREETING' || currentState === 'EXPLORATION')) {
      return 'DEFINITION';
    }

    if (forceStrategy && (currentState === 'EXPLORATION' || currentState === 'CLARIFICATION')) {
      return 'DEFINITION';
    }

    switch (currentState) {
      case 'GREETING':
        return 'EXPLORATION';

      case 'EXPLORATION':
        if (needsClarification) return 'CLARIFICATION';
        if (completenessScore >= 60) return 'DEFINITION';
        return 'EXPLORATION';

      case 'CLARIFICATION':
        if (completenessScore >= 60) return 'DEFINITION';
        return 'EXPLORATION';

      case 'DEFINITION':
        if (userAcceptedProposal) return 'EXECUTION';
        return 'DEFINITION';

      case 'STRATEGY':
        if (userAcceptedProposal) return 'EXECUTION';
        return 'STRATEGY';

      case 'EXECUTION':
        if (userConfirmedComplete) return 'COMPLETED';
        return 'EXECUTION';

      case 'COMPLETED':
        return 'COMPLETED';

      default:
        return 'EXPLORATION';
    }
  }

  /**
   * Solo en EXPLORATION/CLARIFICATION y con score < 60 se hacen preguntas simples.
   * En DEFINITION se muestran 3 opciones, no preguntas.
   */
  shouldAskQuestions(state: ConversationPhase): boolean {
    return state === 'EXPLORATION' || state === 'CLARIFICATION';
  }

  /**
   * En DEFINITION (score 60–79 o más) se generan exactamente 3 propuestas estratégicas.
   * El usuario elige una; solo entonces se pasa a EXECUTION.
   */
  shouldShowThreeProposals(state: ConversationPhase): boolean {
    return state === 'DEFINITION';
  }

  /**
   * Indica si en el estado actual se debe generar roadmap (execution).
   */
  shouldGenerateRoadmap(state: ConversationPhase): boolean {
    return state === 'EXECUTION';
  }
}
