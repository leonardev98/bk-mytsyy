import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import type { ConversationTurn } from '../conversation-modes.interface';
import { AiService } from '../ai.service';
import { RedisMemoryService } from './redis-memory.service';
import { StateMachineService } from './state-machine.service';
import { ScoringService } from './scoring.service';
import { EmbeddingService } from './embedding.service';
import { QuestioningEngineService } from './questioning-engine.service';
import type { BusinessContext, ConversationPhase } from './interfaces/conversation-state.interface';
import type { PersistentSession } from './interfaces/session.interface';
import type { StrategicChatResponse } from './interfaces/strategic-response.interface';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  EXTRACT_CONTEXT_PROMPT,
  THREE_STRATEGIC_OPTIONS_PROMPT,
  NATURAL_SUMMARY_PROMPT,
  IDEAS_RESPONSE_PROMPT,
  FRUSTRATION_RESPONSE_PROMPT,
  MENTOR_REPLY_PROMPT,
  SELF_CHECK_PROMPT,
  REGENERATE_REPLY_PROMPT,
} from './strategic-prompts';
import { IntentDetectionService } from './intent-detection/intent-detection.service';
import { enforceClarity } from './reply-quality';
import {
  applyDeterministicGuards,
  isQuestionAboutDefinedField,
} from './deterministic-guards';

@Injectable()
export class ConversationService {
  private readonly model: ChatOpenAI | null;

  constructor(
    private readonly config: ConfigService,
    private readonly redisMemory: RedisMemoryService,
    private readonly stateMachine: StateMachineService,
    private readonly scoring: ScoringService,
    private readonly embedding: EmbeddingService,
    private readonly questioningEngine: QuestioningEngineService,
    private readonly aiService: AiService,
    private readonly intentDetection: IntentDetectionService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    this.model = apiKey
      ? new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName: this.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
          temperature: 0.2,
        })
      : null;
  }

  /**
   * Ejecuta un turno del agente estratégico. Requiere sessionId.
   */
  async runStrategicTurn(
    sessionId: string,
    message: string,
    history?: ConversationTurn[],
    selectedProposal?: { title?: string; pitch?: string; whyItWins?: string } | null,
    attachedContent?: string,
  ): Promise<StrategicChatResponse> {
    const session = await this.redisMemory.getOrCreate(sessionId);
    const historyText = this.formatHistory(history);

    let currentSession: PersistentSession = { ...session, lastUserMessage: message };
    let objectionAck: string | null = null;
    let forceStrategy = false;
    let wantsIdeas = false;
    let isFrustration = false;

    if (attachedContent?.trim()) {
      const extracted = await this.extractContextFromDocument(attachedContent);
      currentSession = this.mergeContext(currentSession, extracted);
      currentSession.state = 'DEFINITION';
      currentSession.completenessScore = this.scoring.compute(currentSession.businessContext);
    } else {
      const extracted = await this.extractContextFromMessage(message, historyText);
      currentSession = this.mergeContext(currentSession, extracted.updates);
      if (extracted.isObjection && extracted.objectionAcknowledgment) {
        currentSession.lastUserMessage = undefined;
      }
      currentSession.completenessScore = this.scoring.compute(currentSession.businessContext);
      const lastAssistantMessage = history?.filter((t) => t.role === 'assistant').pop()?.content;
      const detected = await this.intentDetection.detect(message, lastAssistantMessage);
      forceStrategy = detected.forceStrategy;
      wantsIdeas = detected.wantsIdeas;
      isFrustration = detected.isFrustration;
      const nextState = this.stateMachine.transition({
        currentState: currentSession.state,
        completenessScore: currentSession.completenessScore,
        userAcceptedProposal: !!selectedProposal?.title,
        needsClarification: extracted.isObjection,
        forceStrategy,
      });
      currentSession.state = nextState;
      objectionAck = extracted.objectionAcknowledgment ?? null;
    }

    if (selectedProposal?.title && (currentSession.state === 'DEFINITION' || currentSession.state === 'STRATEGY')) {
      currentSession.state = 'EXECUTION';
    }

    let reply = '';
    let questions: string[] = [];
    let mode: 'exploration' | 'proposal' | 'execution' = 'exploration';
    let proposals: StrategicChatResponse['proposals'];
    let roadmap: StrategicChatResponse['roadmap'];
    let selectedProject: StrategicChatResponse['selectedProject'];
    let introMessage: string | undefined;
    let frontendHint: StrategicChatResponse['frontendHint'];

    const summary =
      (await this.buildNaturalSummary(currentSession.businessContext)) ||
      'Estamos afinando tu idea.';

    if (this.stateMachine.shouldGenerateRoadmap(currentSession.state)) {
      const executionResponse = await this.aiService.runTurn(
        message,
        history,
        selectedProposal ?? undefined,
        undefined,
      );
      if (executionResponse.mode === 'execution') {
        mode = 'execution';
        reply = executionResponse.introMessage ?? 'Aquí tienes tu plan para los primeros 30 días.';
        roadmap = executionResponse.roadmap;
        selectedProject = executionResponse.selectedProject;
      }
    } else if (this.stateMachine.shouldShowThreeProposals(currentSession.state) && currentSession.completenessScore >= 60) {
      if (wantsIdeas) {
        reply = await this.generateIdeasResponse(message, summary);
        mode = 'exploration';
        questions = [];
      } else if (isFrustration) {
        reply = await this.generateFrustrationResponse(message, summary);
        mode = 'exploration';
        questions = [];
      } else {
        const options = await this.generateThreeStrategicOptions(
          currentSession.businessContext,
          summary,
        );
        mode = 'proposal';
        reply = options.length > 0
          ? this.formatThreeProposalsReply(options) + '\n\n¿Cuál te vibra más?'
          : 'Con lo que tenemos, el siguiente paso es elegir un enfoque. ¿Quieres que te proponga 3 opciones?';
        proposals = options.length > 0 ? options : undefined;
        frontendHint = options.length > 0 ? { display: 'cards', cardCount: 3, primaryCTA: 'Seleccionar proyecto' } : undefined;
      }
    } else if (this.stateMachine.shouldAskQuestions(currentSession.state)) {
      const antiForm =
        currentSession.completenessScore >= 60 &&
        currentSession.lastResponseType === 'question';
      if (antiForm) {
        const options = await this.generateThreeStrategicOptions(
          currentSession.businessContext,
          summary,
        );
        reply = options.length > 0
          ? this.formatThreeProposalsReply(options) + '\n\n¿Cuál te vibra más?'
          : 'Con lo que tenemos, el siguiente paso es elegir un enfoque.';
        mode = 'proposal';
        proposals = options.length > 0 ? options : undefined;
        frontendHint = options.length > 0 ? { display: 'cards', cardCount: 3, primaryCTA: 'Seleccionar proyecto' } : undefined;
        currentSession.state = 'DEFINITION';
      } else {
        const next = await this.questioningEngine.getNextQuestion({
          businessContext: currentSession.businessContext,
          askedQuestions: currentSession.askedQuestions,
          semanticEmbeddings: currentSession.semanticEmbeddings,
          summaryForContext: summary,
        });
        const oneQuestion = next ? next.question : null;
        if (oneQuestion) {
          currentSession.askedQuestions = [...currentSession.askedQuestions, oneQuestion];
          currentSession.semanticEmbeddings = [...currentSession.semanticEmbeddings, next!.embedding];
        }
        reply = await this.buildMentorReply(summary, objectionAck, oneQuestion);
        if (oneQuestion && !reply.includes(oneQuestion)) {
          questions = [oneQuestion];
        } else {
          questions = [];
        }
      }
    }

    if (!reply && currentSession.state === 'GREETING') {
      const next = await this.questioningEngine.getNextQuestion({
        businessContext: currentSession.businessContext,
        askedQuestions: currentSession.askedQuestions,
        semanticEmbeddings: currentSession.semanticEmbeddings,
      });
      const oneQuestion = next ? next.question : null;
      if (oneQuestion) {
        currentSession.askedQuestions = [...currentSession.askedQuestions, oneQuestion];
        currentSession.semanticEmbeddings = [...currentSession.semanticEmbeddings, next!.embedding];
      }
      reply = await this.buildMentorReply(
        'Estamos empezando.',
        null,
        oneQuestion ?? undefined,
      );
      if (oneQuestion && !reply.includes(oneQuestion)) {
        questions = [oneQuestion];
      } else {
        questions = [];
      }
      if (!reply) {
        reply = 'Hola 👋 ¿En qué estás o qué te gustaría montar?';
        if (oneQuestion) reply += '\n\n' + oneQuestion;
      }
    }

    let draftReply = reply || summary;
    let draftQuestions = [...questions].filter(Boolean);

    const guards = applyDeterministicGuards(
      draftReply,
      draftQuestions,
      currentSession,
    );
    draftReply = guards.reply;
    draftQuestions = guards.questions;

    if (
      draftReply.trim().endsWith('?') &&
      isQuestionAboutDefinedField(draftReply, currentSession) &&
      currentSession.completenessScore >= 60
    ) {
      const options = await this.generateThreeStrategicOptions(
        currentSession.businessContext,
        summary,
      );
      draftReply = options.length > 0
        ? this.formatThreeProposalsReply(options) + '\n\n¿Cuál te vibra más?'
        : draftReply;
      draftQuestions = [];
      mode = 'proposal';
      proposals = options.length > 0 ? options : undefined;
      frontendHint = options.length > 0 ? { display: 'cards', cardCount: 3, primaryCTA: 'Seleccionar proyecto' } : undefined;
    }

    draftReply = enforceClarity(draftReply);

    const selfChecked = await this.runSelfCheckAndEnforce(
      draftReply,
      draftQuestions,
      currentSession,
      history,
    );
    draftReply = selfChecked.reply;
    draftQuestions = selfChecked.questions;

    draftReply = enforceClarity(draftReply);

    currentSession.lastResponseType = this.detectLastResponseType(draftReply);
    currentSession.updatedAt = new Date().toISOString();
    await this.redisMemory.set(sessionId, currentSession);

    return {
      conversationState: currentSession.state,
      reply: draftReply || summary,
      questions: draftQuestions,
      completenessScore: currentSession.completenessScore,
      mode,
      proposals,
      roadmap,
      selectedProject,
      introMessage,
      frontendHint,
    };
  }

  private detectLastResponseType(reply: string): 'question' | 'value' {
    if (!reply?.trim()) return 'value';
    const valuePhrases = [
      /puedes empezar con/i,
      /te propongo/i,
      /una buena opción sería/i,
      /siguiente paso/i,
      /te sugiero/i,
      /podrías considerar/i,
    ];
    if (valuePhrases.some((re) => re.test(reply))) return 'value';
    if (/\?$/.test(reply.trim())) return 'question';
    return 'value';
  }

  private formatHistory(history: ConversationTurn[] | undefined): string {
    if (!history?.length) return '(No previous messages)';
    return history
      .slice(-10)
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
      .join('\n');
  }

  private mergeContext(
    session: PersistentSession,
    updates: Partial<BusinessContext>,
  ): PersistentSession {
    const businessContext = { ...session.businessContext };
    for (const [k, v] of Object.entries(updates)) {
      if (v != null && String(v).trim() !== '' && k in businessContext) {
        (businessContext as Record<string, unknown>)[k] = v;
      }
    }
    return { ...session, businessContext };
  }

  private async extractContextFromMessage(
    message: string,
    history: string,
  ): Promise<{
    updates: Partial<BusinessContext>;
    isObjection: boolean;
    objectionAcknowledgment: string | null;
    summary: string;
  }> {
    const fallback = {
      updates: {},
      isObjection: false,
      objectionAcknowledgment: null as string | null,
      summary: '',
    };
    if (!this.model) return fallback;
    const chain = EXTRACT_CONTEXT_PROMPT.pipe(this.model);
    const msg = await chain.invoke({ message, history });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as {
        updates?: Record<string, string | null>;
        isObjection?: boolean;
        objectionAcknowledgment?: string | null;
        summary?: string;
      };
      const updates: Partial<BusinessContext> = {};
      if (parsed.updates && typeof parsed.updates === 'object') {
        for (const [key, value] of Object.entries(parsed.updates)) {
          if (key in fallback.updates || key in { idea: 1, target: 1, productType: 1, monetization: 1, differentiation: 1, niche: 1, channels: 1, brandPositioning: 1, maturityLevel: 1 }) {
            (updates as Record<string, unknown>)[key] = value ?? null;
          }
        }
      }
      return {
        updates,
        isObjection: !!parsed.isObjection,
        objectionAcknowledgment: parsed.objectionAcknowledgment ?? null,
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    } catch {
      return fallback;
    }
  }

  private async extractContextFromDocument(
    attachedContent: string,
  ): Promise<Partial<BusinessContext>> {
    if (!this.model) return {};
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'Extrae del siguiente documento de proyecto/idea los campos de negocio. Responde SOLO un JSON con keys: idea, target, productType, monetization, differentiation (y opcionalmente niche, channels). Valores null si no se mencionan.',
      ],
      ['human', '{document}'],
    ]);
    const chain = prompt.pipe(this.model);
    const msg = await chain.invoke({ document: attachedContent.slice(0, 8000) });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    try {
      const parsed = JSON.parse(text.replace(/```json\s*|\s*```/g, '').trim()) as Record<string, unknown>;
      const updates: Partial<BusinessContext> = {};
      const keys: (keyof BusinessContext)[] = [
        'idea', 'target', 'niche', 'productType', 'monetization',
        'differentiation', 'channels', 'brandPositioning', 'maturityLevel',
      ];
      for (const k of keys) {
        const v = parsed[k];
        if (v != null && typeof v === 'string') updates[k] = v;
      }
      return updates;
    } catch {
      return {};
    }
  }

  private async buildNaturalSummary(context: BusinessContext): Promise<string> {
    const filled = Object.entries(context).filter(
      ([, v]) => v != null && String(v).trim() !== '',
    );
    if (filled.length === 0) return '';
    if (!this.model) {
      return filled.map(([, v]) => v).join('. ');
    }
    const chain = NATURAL_SUMMARY_PROMPT.pipe(this.model);
    const msg = await chain.invoke({
      businessContext: JSON.stringify(context),
    });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    const natural = text.replace(/^(idea|target|productType|monetization|differentiation):\s*/gim, '').trim();
    return natural || filled.map(([, v]) => v).join('. ');
  }

  private async buildMentorReply(
    summary: string,
    objectionAck: string | null,
    optionalQuestion?: string | null,
  ): Promise<string> {
    if (!this.model) {
      const parts: string[] = [];
      if (objectionAck) parts.push(objectionAck);
      parts.push(summary);
      if (optionalQuestion) parts.push(optionalQuestion);
      return parts.filter(Boolean).join('\n\n');
    }
    const chain = MENTOR_REPLY_PROMPT.pipe(this.model);
    const msg = await chain.invoke({
      summary: objectionAck ? `${objectionAck}\n${summary}` : summary,
      optionalQuestion: optionalQuestion ?? '',
    });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    return text.replace(/\b(idea|target|productType|monetization|differentiation):\s*/gim, '').trim();
  }

  private async generateIdeasResponse(message: string, summary: string): Promise<string> {
    if (!this.model) {
      return `Con lo que comentas, te sugiero enfocarte en una propuesta clara, definir a quién va dirigida y un primer canal. ¿Quieres que baje esto a 3 ideas concretas?`;
    }
    const chain = IDEAS_RESPONSE_PROMPT.pipe(this.model);
    const msg = await chain.invoke({ message, summary });
    return typeof msg.content === 'string' ? msg.content : String(msg.content);
  }

  private async generateFrustrationResponse(message: string, summary: string): Promise<string> {
    if (!this.model) {
      return `Tienes razón, vamos al grano. Con lo que tenemos, el siguiente paso sería definir una propuesta concreta. ¿Te gustaría que te proponga algo ya?`;
    }
    const chain = FRUSTRATION_RESPONSE_PROMPT.pipe(this.model);
    const msg = await chain.invoke({ message, summary });
    return typeof msg.content === 'string' ? msg.content : String(msg.content);
  }

  /**
   * Self-check contextual: valida contra preguntas ya hechas y campos ya definidos.
   * Si falla, regenera una vez. Recibe sesión para filledFields, lastUserMessages, score.
   */
  private async runSelfCheckAndEnforce(
    draftReply: string,
    draftQuestions: string[],
    session: PersistentSession,
    history?: ConversationTurn[],
  ): Promise<{ reply: string; questions: string[] }> {
    if (!this.model || !draftReply?.trim()) {
      return { reply: draftReply, questions: draftQuestions };
    }
    const filledFields = this.getFilledFieldsSummary(session.businessContext);
    const lastUserMessages = history
      ? history
          .filter((t) => t.role === 'user')
          .slice(-2)
          .map((t) => t.content.slice(0, 150))
          .join(' | ')
      : '(ninguno)';

    try {
      const chain = SELF_CHECK_PROMPT.pipe(this.model);
      const msg = await chain.invoke({
        draftReply,
        draftQuestions: draftQuestions.join(' | ') || '(ninguna)',
        askedQuestions: session.askedQuestions.slice(-5).join(' | ') || '(ninguna)',
        filledFields,
        lastUserMessages,
        completenessScore: String(session.completenessScore),
      });
      const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { valid?: boolean; reason?: string };
      if (parsed.valid) {
        return { reply: draftReply, questions: draftQuestions };
      }
      const reason = typeof parsed.reason === 'string' ? parsed.reason : 'No cumple criterios de calidad';
      const regenChain = REGENERATE_REPLY_PROMPT.pipe(this.model);
      const regenMsg = await regenChain.invoke({
        reason,
        draftReply,
      });
      const regenText = typeof regenMsg.content === 'string' ? regenMsg.content : String(regenMsg.content);
      const fixedReply = regenText.replace(/\b(idea|target|productType|monetization|differentiation):\s*/gim, '').trim();
      const clearQuestions =
        /duplicad|ya respondida|repetida|pregunta.*ya|campo.*definido/i.test(reason)
          ? []
          : draftQuestions;
      return { reply: fixedReply || draftReply, questions: clearQuestions };
    } catch {
      return { reply: draftReply, questions: draftQuestions };
    }
  }

  private getFilledFieldsSummary(context: BusinessContext): string {
    const entries = Object.entries(context).filter(
      ([, v]) => v != null && String(v).trim() !== '',
    );
    if (entries.length === 0) return '(ninguno)';
    return entries.map(([k]) => k).join(', ');
  }

  /**
   * FAST ENTREPRENEUR: formato 1️⃣ Nombre / 1 línea enfoque / 1 línea por qué. Nada más.
   */
  private formatThreeProposalsReply(
    options: Array<{ title: string; pitch: string; whyItWins: string }>,
  ): string {
    const labels = ['1️⃣', '2️⃣', '3️⃣'];
    return options
      .slice(0, 3)
      .map((o, i) => {
        const name = o.title?.trim() || `Opción ${i + 1}`;
        const pitch = o.pitch?.trim() || '';
        const why = o.whyItWins?.trim() || '';
        const parts = [pitch, why].filter(Boolean);
        return `${labels[i]} ${name}\n${parts.join('\n')}`;
      })
      .join('\n\n');
  }

  /**
   * Genera exactamente 3 opciones estratégicas distintas (nombre, enfoque en 1 línea, por qué en 1 línea).
   * FAST ENTREPRENEUR: compacto, sin roadmap ni stack.
   */
  private async generateThreeStrategicOptions(
    businessContext: BusinessContext,
    summary: string,
  ): Promise<Array<{ title: string; pitch: string; whyItWins: string }>> {
    if (!this.model) return [];
    const chain = THREE_STRATEGIC_OPTIONS_PROMPT.pipe(this.model);
    const msg = await chain.invoke({
      businessContext: JSON.stringify(businessContext, null, 0),
      summary,
    });
    const text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as { options?: Array<{ title?: string; pitch?: string; whyItWins?: string }> };
      const options = Array.isArray(parsed?.options) ? parsed.options : [];
      return options
        .filter((o) => o && (o.title ?? o.pitch))
        .slice(0, 3)
        .map((o) => ({
          title: String(o.title ?? o.pitch ?? '').trim() || 'Opción',
          pitch: String(o.pitch ?? '').trim(),
          whyItWins: String(o.whyItWins ?? '').trim(),
        }));
    } catch {
      return [];
    }
  }
}
