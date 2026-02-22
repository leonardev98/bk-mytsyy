import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import type { CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { IntentClassification, StrategicIntentType } from './intent-schema';
import { IntentClassificationSchema } from './intent-schema';
import type { ConfigService } from '@nestjs/config';

/** Estado del grafo: entrada (mensaje usuario + opcional último asistente) y salida (intent). */
const IntentStateAnnotation = Annotation.Root({
  message: Annotation<string>(),
  lastAssistantMessage: Annotation<string | undefined>(),
  intent: Annotation<StrategicIntentType | undefined>(),
});

type IntentState = typeof IntentStateAnnotation.State;

const INTENT_CLASSIFY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an intent classifier for a startup mentor chat. The user may write in ANY language, with or without correct spelling/accents.

Classify the user's message into EXACTLY one of:
- frustration: user is frustrated, says questions are too many/complex, asks to stop asking, "no me preguntes mas", "too complicated", "no entiendo", etc. (any language).
- wants_ideas: user asks for ideas, suggestions, options, "dame ideas", "que me recomiendas", "help me think", "no tengo idea", "sugiere", "propón", etc. (any language).
- confused: very short reply, hesitation, "no se", "no lo se", "tal vez", "quizas", "..." (any language).
- neutral: none of the above; normal reply or question.

Consider meaning and intent, not exact words. Ignore typos and missing accents. Respond with a JSON object: { "intent": "frustration" | "wants_ideas" | "confused" | "neutral" }`,
  ],
  [
    'human',
    'Last assistant message (if any): {lastAssistantMessage}\n\nUser message: {message}\n\nClassify intent (JSON only):',
  ],
]);

/**
 * Crea y compila el grafo LangGraph de un solo nodo: clasificar mensaje → intent.
 * Sin regex; solo LLM con salida estructurada (Zod). Funciona con cualquier idioma y ortografía.
 */
export function createIntentDetectionGraph(config: ConfigService): CompiledStateGraph<IntentState, Partial<IntentState>, string> {
  const apiKey = config.get<string>('OPENAI_API_KEY')?.trim();
  const model = apiKey
    ? new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.get('OPENAI_MODEL', 'gpt-4o-mini'),
        temperature: 0,
      })
    : null;

  const graph = new StateGraph(IntentStateAnnotation);

  const withNode = graph.addNode('classify', async (state: IntentState): Promise<Partial<IntentState>> => {
    if (!model) {
      return { intent: 'neutral' as StrategicIntentType };
    }
    const chain = INTENT_CLASSIFY_PROMPT.pipe(
      model.withStructuredOutput(IntentClassificationSchema, { name: 'intent_classifier' }),
    );
    const lastAssistant = state.lastAssistantMessage ?? '(none)';
    const result = await chain.invoke({
      message: state.message,
      lastAssistantMessage: lastAssistant,
    }) as IntentClassification;
    return { intent: result.intent };
  });

  withNode.addEdge(START, 'classify');
  withNode.addEdge('classify', END);

  return withNode.compile();
}
