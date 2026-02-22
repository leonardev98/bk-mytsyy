import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { BusinessContext } from './interfaces/conversation-state.interface';
import { CONTEXT_FIELD_PRIORITY } from './interfaces/conversation-state.interface';
import { EmbeddingService } from './embedding.service';

const SIMILARITY_THRESHOLD = 0.85;

export interface NextQuestionInput {
  businessContext: BusinessContext;
  askedQuestions: string[];
  semanticEmbeddings: number[][];
  /** Resumen de lo entendido hasta ahora (para contexto del LLM). */
  summaryForContext?: string;
}

/**
 * Motor de preguntas dinámicas: detecta campos vacíos, prioridad, genera 1 pregunta no repetida semánticamente.
 */
@Injectable()
export class QuestioningEngineService {
  private readonly model: ChatOpenAI | null;
  private readonly similarityThreshold: number;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    this.model = apiKey
      ? new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName: this.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
          temperature: 0.3,
        })
      : null;
    this.similarityThreshold =
      this.config.get<number>('QUESTION_SIMILARITY_THRESHOLD', SIMILARITY_THRESHOLD) ?? SIMILARITY_THRESHOLD;
  }

  /**
   * Devuelve el primer campo vacío según prioridad.
   */
  getNextEmptyField(context: BusinessContext): keyof BusinessContext | null {
    for (const field of CONTEXT_FIELD_PRIORITY) {
      const value = context[field];
      if (value == null || String(value).trim() === '') return field;
    }
    return null;
  }

  /**
   * Genera una pregunta natural para el campo dado. Usa LLM para que suene a mentor, no a formulario.
   */
  async generateQuestionForField(
    field: keyof BusinessContext,
    context: BusinessContext,
    summaryForContext?: string,
  ): Promise<string> {
    if (!this.model) {
      return this.getFallbackQuestion(field);
    }
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `FAST ENTREPRENEUR MODE. Genera UNA pregunta potente: corta, clara, aterrizadora. Nada técnica.
- Correcto: "¿Quieres enfocarte en streetwear, ropa elegante o algo más urbano?"
- Incorrecto: "¿Qué necesidades específicas del mercado juvenil buscas abordar?"
Sin jerga (evitar posicionamiento, estrategia diferencial, monetización). Responde solo la pregunta. Mismo idioma.`,
      ],
      [
        'human',
        'Contexto: {businessContext}\nResumen: {summary}\nCampo a descubrir: {field}\n\nUna pregunta potente (corta, opciones concretas si aplica):',
      ],
    ]);
    const chain = prompt.pipe(this.model);
    const msg = await chain.invoke({
      businessContext: JSON.stringify(context),
      summary: summaryForContext ?? '(aún no hay resumen)',
      field,
    });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    return text.replace(/^["']|["']$/g, '').trim() || this.getFallbackQuestion(field);
  }

  private getFallbackQuestion(field: keyof BusinessContext): string {
    const fallbacks: Record<string, string> = {
      idea: '¿Qué idea de negocio tienes en mente?',
      target: '¿A quién va dirigido tu producto o servicio?',
      productType: '¿Qué tipo de producto o servicio es?',
      monetization: '¿Cómo planeas monetizar?',
      differentiation: '¿Qué te diferencia de la competencia?',
      niche: '¿En qué nicho te enfocarías?',
      channels: '¿Por qué canales venderás o comunicarás?',
      brandPositioning: '¿Cómo te gustaría posicionar tu marca?',
      maturityLevel: '¿En qué etapa está tu proyecto?',
    };
    return fallbacks[field] ?? `¿Podrías contarme más sobre ${field}?`;
  }

  /**
   * Obtiene la siguiente pregunta y su embedding para persistir. Campo vacío prioritario, generada por LLM, validada por similitud.
   */
  async getNextQuestion(input: NextQuestionInput): Promise<{ question: string; embedding: number[] } | null> {
    const { businessContext, semanticEmbeddings, summaryForContext } = input;
    const field = this.getNextEmptyField(businessContext);
    if (!field) return null;

    let question = await this.generateQuestionForField(field, businessContext, summaryForContext);
    if (!question) return null;

    let newEmbedding = this.embeddingService.isAvailable() ? await this.embeddingService.embed(question) : [];

    if (newEmbedding.length > 0) {
      const tooSimilar = this.embeddingService.isTooSimilarToExisting(
        newEmbedding,
        semanticEmbeddings,
        this.similarityThreshold,
      );
      if (tooSimilar) {
        const nextField = this.getNextEmptyFieldExcept(businessContext, field);
        if (nextField) {
          question = await this.generateQuestionForField(nextField, businessContext, summaryForContext);
          newEmbedding = await this.embeddingService.embed(question);
          if (this.embeddingService.isTooSimilarToExisting(newEmbedding, semanticEmbeddings, this.similarityThreshold)) {
            return null;
          }
        } else {
          return null;
        }
      }
    }

    return { question, embedding: newEmbedding };
  }

  private getNextEmptyFieldExcept(context: BusinessContext, exclude: keyof BusinessContext): keyof BusinessContext | null {
    for (const field of CONTEXT_FIELD_PRIORITY) {
      if (field === exclude) continue;
      const value = context[field];
      if (value == null || String(value).trim() === '') return field;
    }
    return null;
  }
}
