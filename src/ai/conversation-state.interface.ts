import { Annotation } from '@langchain/langgraph';

/**
 * Conversation State — 2-step pipeline: intent+profile → proposals+roadmap.
 * Includes assumptions, detected language, and per-proposal score/risks/nextBestStep.
 */

export interface Profile {
  skills: string[];
  timeAvailable: number;
  capitalAvailable: number;
  location: string;
  language?: string;
}

export interface Proposal {
  title: string;
  description: string;
  businessModel: string;
  whyThisIsScalable: string;
  score: number;
  risks: string[];
  nextBestStep: string;
}

export interface RoadmapWeek {
  week: number;
  goals: string[];
  actions: string[];
}

/** API response shape — one unified JSON. */
export interface ConversationState {
  rawInput: string;
  /** When false: user only said hello / no idea yet. Show conversationReply and wait for their idea. */
  hasProjectIdea?: boolean;
  /** Message to show when hasProjectIdea is false (e.g. "¿Qué proyecto tienes en mente?") */
  conversationReply?: string;
  interpretedIntent?: string;
  profile?: Profile;
  assumptions?: string[];
  proposals?: Proposal[];
  recommendedProposalIndex?: number;
  recommendedReason?: string;
  roadmap?: { weeks: RoadmapWeek[] };
  tokenUsage?: { promptTokens: number; completionTokens: number };
}

/**
 * LangGraph state annotation for the 2-node graph.
 */
export const ConversationStateAnnotation = Annotation.Root({
  rawInput: Annotation<string>,
  hasProjectIdea: Annotation<boolean | undefined>,
  conversationReply: Annotation<string | undefined>,
  interpretedIntent: Annotation<string | undefined>,
  profile: Annotation<Profile | undefined>,
  assumptions: Annotation<string[] | undefined>,
  proposals: Annotation<Proposal[] | undefined>,
  recommendedProposalIndex: Annotation<number | undefined>,
  recommendedReason: Annotation<string | undefined>,
  roadmap: Annotation<{ weeks: RoadmapWeek[] } | undefined>,
  tokenUsage: Annotation<
    | { promptTokens: number; completionTokens: number }
    | undefined
  >,
});
