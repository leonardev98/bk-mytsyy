import { z } from 'zod';

const VALIDATION_ERROR_MAX_LENGTH = 200;
export const truncateValidationError = (err: string) =>
  err.length <= VALIDATION_ERROR_MAX_LENGTH ? err : err.slice(0, VALIDATION_ERROR_MAX_LENGTH) + '…';

/** Modo EXPLORATION: respuesta conversacional y opcionalmente una pregunta guía. */
export const ExplorationSchema = z.object({
  mode: z.literal('exploration'),
  reply: z.string().optional(),
  questions: z.array(z.string()).min(0).max(3).default([]),
});

/** Propuesta en modo PROPOSAL: title, pitch, whyItWins. */
export const ProposalCardSchema = z.object({
  title: z.string().min(1).default(''),
  pitch: z.string().default(''),
  whyItWins: z.string().default(''),
});

/** Modo PROPOSAL: 3 propuestas + frontendHint. */
export const ProposalModeSchema = z.object({
  mode: z.literal('proposal'),
  proposals: z.array(ProposalCardSchema).default([]),
  frontendHint: z
    .object({
      display: z.literal('cards'),
      cardCount: z.literal(3),
      primaryCTA: z.string().default('Seleccionar proyecto'),
    })
    .default({ display: 'cards', cardCount: 3, primaryCTA: 'Seleccionar proyecto' }),
});

/** Semana del roadmap. */
export const RoadmapWeekSchema = z.object({
  week: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(1).max(4)),
  goals: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
});

/** Modo EXECUTION: proyecto seleccionado o documento adjunto + roadmap (primeros 30 días). */
export const ExecutionSchema = z.object({
  mode: z.literal('execution'),
  introMessage: z.string().optional(),
  selectedProject: z.object({
    title: z.string().default(''),
    description: z.string().default(''),
  }),
  roadmap: z.object({
    weeks: z.array(RoadmapWeekSchema).default([]),
  }),
});

/** Respuesta del turno: uno de los tres modos. */
export const ChatResponseSchema = z.discriminatedUnion('mode', [
  ExplorationSchema,
  ProposalModeSchema,
  ExecutionSchema,
]);

export type ExplorationOutput = z.infer<typeof ExplorationSchema>;
export type ProposalModeOutput = z.infer<typeof ProposalModeSchema>;
export type ExecutionOutput = z.infer<typeof ExecutionSchema>;
export type ChatResponseOutput = z.infer<typeof ChatResponseSchema>;
