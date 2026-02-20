import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import type { ChatResponse, ConversationTurn, ProposalCard, RoadmapWeek } from './conversation-modes.interface';
import {
  TURN_PROMPT,
  TURN_RETRY_PROMPT,
} from './prompts';
import {
  ChatResponseSchema,
  truncateValidationError,
  type ChatResponseOutput,
} from './schemas';

const CACHE_MAX_SIZE = 100;

@Injectable()
export class AiService {
  private readonly model: ChatOpenAI | null;
  private readonly cache = new Map<string, ChatResponse>();

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const trimmed = apiKey?.trim();

    if (!trimmed) {
      this.model = null;
      return;
    }

    this.model = new ChatOpenAI({
      openAIApiKey: trimmed,
      modelName: this.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
      temperature: 0,
    });
  }

  private formatHistory(history: ConversationTurn[] | undefined): string {
    if (!history?.length) return '(No previous messages)';
    return history
      .slice(-10)
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
      .join('\n');
  }

  private formatSelectedProposal(selected: { title?: string; pitch?: string; whyItWins?: string } | undefined): string {
    if (!selected?.title) return '(none)';
    return JSON.stringify(selected);
  }

  private extractJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    try {
      return JSON.parse(cleaned) as unknown;
    } catch {
      return null;
    }
  }

  private static readonly EXPLORATION_FALLBACK_REPLY = 'Cuando quieras, cuéntame en qué andas o qué te gustaría crear.';
  private static readonly EXPLORATION_FALLBACK_QUESTION = '¿En qué estás pensando o qué te gustaría montar?';
  private static readonly META_PHRASE_PATTERN = /te hago (unas )?preguntas|afinar tu idea|preguntas clave/i;

  private normalizeResponse(parsed: ChatResponseOutput): ChatResponse {
    if (parsed.mode === 'exploration') {
      let reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : undefined;
      const list = Array.isArray(parsed.questions) ? parsed.questions.filter(Boolean) : [];
      let oneQuestion = list[0];
      if (oneQuestion && AiService.META_PHRASE_PATTERN.test(oneQuestion)) {
        oneQuestion = AiService.EXPLORATION_FALLBACK_QUESTION;
      }
      const questions = oneQuestion ? [oneQuestion] : [];
      if (!reply && questions.length === 0) {
        reply = AiService.EXPLORATION_FALLBACK_REPLY;
      }
      return { mode: 'exploration', ...(reply ? { reply } : {}), questions };
    }
    if (parsed.mode === 'proposal') {
      const proposals = (parsed.proposals ?? []).slice(0, 3).map((p) => ({
        title: String(p?.title ?? ''),
        pitch: String(p?.pitch ?? ''),
        whyItWins: String(p?.whyItWins ?? ''),
      }));
      while (proposals.length < 3) {
        proposals.push({ title: '', pitch: '', whyItWins: '' });
      }
      return {
        mode: 'proposal',
        proposals: proposals as ProposalCard[],
        frontendHint: {
          display: 'cards',
          cardCount: 3,
          primaryCTA: parsed.frontendHint?.primaryCTA ?? 'Seleccionar proyecto',
        },
      };
    }
    if (parsed.mode === 'execution') {
      const weeks = (parsed.roadmap?.weeks ?? []).slice(0, 4).map((w, i) => ({
        week: i + 1,
        goals: Array.isArray(w?.goals) ? w.goals.map(String) : [],
        actions: Array.isArray(w?.actions) ? w.actions.map(String) : [],
      }));
      while (weeks.length < 4) {
        weeks.push({ week: weeks.length + 1, goals: [], actions: [] });
      }
      const introMessage =
        typeof parsed.introMessage === 'string' && parsed.introMessage.trim()
          ? parsed.introMessage.trim()
          : undefined;
      return {
        mode: 'execution',
        ...(introMessage ? { introMessage } : {}),
        selectedProject: {
          title: String(parsed.selectedProject?.title ?? ''),
          description: String(parsed.selectedProject?.description ?? ''),
        },
        roadmap: { weeks: weeks as RoadmapWeek[] },
      };
    }
    return {
      mode: 'exploration',
      reply: AiService.EXPLORATION_FALLBACK_REPLY,
      questions: [],
    };
  }

  /**
   * Un turno de conversación: 1 llamada al modelo. Si attachedContent está presente, el modelo va directo a EXECUTION (roadmap 30 días).
   */
  async runTurn(
    message: string,
    history?: ConversationTurn[],
    selectedProposal?: { title?: string; pitch?: string; whyItWins?: string } | null,
    attachedContent?: string,
  ): Promise<ChatResponse> {
    if (!this.model) {
      throw new HttpException(
        'OPENAI_API_KEY is not set. Add it to .env to use the AI pipeline.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const historyText = this.formatHistory(history);
    const selectedText = this.formatSelectedProposal(selectedProposal ?? undefined);
    const attachedText = attachedContent?.trim() || '(ninguno)';
    const cacheKey = `${message}|${historyText}|${selectedText}|${attachedText.slice(0, 500)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const chain = TURN_PROMPT.pipe(this.model);
    let msg = await chain.invoke({
      message: message.trim(),
      history: historyText,
      selectedProposal: selectedText,
      attachedContent: attachedText,
    });
    let text = typeof msg.content === 'string' ? msg.content : String(msg.content);
    let parsed = this.extractJson(text) as Record<string, unknown> | null;
    let result = parsed ? ChatResponseSchema.safeParse(parsed) : { success: false as const, error: new Error('No JSON') };

    if (!result.success) {
      const errMsg = truncateValidationError(result.error.message);
      const retryChain = TURN_RETRY_PROMPT.pipe(this.model);
      msg = await retryChain.invoke({
        validationError: errMsg,
        message: message.trim(),
        history: historyText,
        selectedProposal: selectedText,
        attachedContent: attachedText,
      });
      text = typeof msg.content === 'string' ? msg.content : String(msg.content);
      parsed = this.extractJson(text) as Record<string, unknown> | null;
      result = parsed ? ChatResponseSchema.safeParse(parsed) : { success: false as const, error: new Error('No JSON on retry') };
    }

    const output: ChatResponseOutput = result.success
      ? result.data
      : { mode: 'exploration', reply: AiService.EXPLORATION_FALLBACK_REPLY, questions: [] };
    const response = this.normalizeResponse(output);
    this.setCache(cacheKey, response);
    return response;
  }

  private cacheKey(raw: string): string {
    return raw.trim().toLowerCase().slice(0, 500);
  }

  private getCached(key: string): ChatResponse | undefined {
    const k = this.cacheKey(key);
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
    return this.cache.get(k);
  }

  private setCache(key: string, value: ChatResponse): void {
    this.cache.set(this.cacheKey(key), value);
  }

  /**
   * Streaming: un solo evento "complete" con la respuesta (1 llamada por turno).
   */
  async *runTurnStream(
    message: string,
    history?: ConversationTurn[],
    selectedProposal?: { title?: string; pitch?: string; whyItWins?: string } | null,
    attachedContent?: string,
  ): AsyncGenerator<{ type: 'started' | 'complete'; data: ChatResponse }> {
    yield { type: 'started', data: { mode: 'exploration', questions: [] } };
    const data = await this.runTurn(message, history, selectedProposal, attachedContent);
    yield { type: 'complete', data };
  }
}
