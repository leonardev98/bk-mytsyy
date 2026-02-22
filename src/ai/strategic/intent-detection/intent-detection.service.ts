import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createIntentDetectionGraph } from './intent-detection.graph';
import type { StrategicIntentType } from './intent-schema';

export interface DetectedIntent {
  intent: StrategicIntentType;
  forceStrategy: boolean;
  wantsIdeas: boolean;
  isFrustration: boolean;
  isConfused: boolean;
}

/**
 * Detección de intención del usuario con LangGraph + LLM (salida estructurada Zod).
 * No usa regex ni validaciones semánticas: funciona con cualquier idioma, sin tildes y con typos.
 */
@Injectable()
export class IntentDetectionService {
  private readonly compiledGraph: { invoke: (input: { message: string; lastAssistantMessage?: string }) => Promise<{ intent?: StrategicIntentType }> };

  constructor(private readonly config: ConfigService) {
    this.compiledGraph = createIntentDetectionGraph(this.config);
  }

  /**
   * Clasifica la intención del mensaje del usuario (LangGraph + LLM).
   * No depende de tildes ni idioma; funciona con typos y cualquier lengua.
   * @param message - Mensaje del usuario.
   * @param lastAssistantMessage - Última respuesta del asistente (opcional).
   */
  async detect(message: string, lastAssistantMessage?: string): Promise<DetectedIntent> {
    const normalized = message?.trim() ?? '';
    if (normalized.length < 2) {
      return this.resultFor('neutral');
    }

    try {
      const finalState = await this.compiledGraph.invoke({
        message: normalized,
        lastAssistantMessage: lastAssistantMessage?.trim() || undefined,
      });
      const intent = (finalState?.intent as StrategicIntentType) ?? 'neutral';
      return this.resultFor(intent);
    } catch {
      return this.resultFor('neutral');
    }
  }

  private resultFor(intent: StrategicIntentType): DetectedIntent {
    return {
      intent,
      forceStrategy: intent === 'frustration' || intent === 'wants_ideas',
      wantsIdeas: intent === 'wants_ideas',
      isFrustration: intent === 'frustration',
      isConfused: intent === 'confused',
    };
  }
}
