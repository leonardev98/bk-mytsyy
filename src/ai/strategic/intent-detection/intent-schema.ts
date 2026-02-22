import { z } from 'zod';

/** Intenciones detectadas por LLM (sin depender de tildes, idioma ni ortografía). */
export const StrategicIntent = z.enum([
  'frustration',  // Usuario frustrado o pide que no sigan las preguntas
  'wants_ideas',  // Pide ideas, sugerencias o que le propongamos algo
  'confused',     // Respuesta muy corta, duda, "no sé"
  'neutral',      // Ninguna de las anteriores
]);
export type StrategicIntentType = z.infer<typeof StrategicIntent>;

/** Salida estructurada del clasificador (LangGraph + LLM). */
export const IntentClassificationSchema = z.object({
  intent: StrategicIntent,
});
export type IntentClassification = z.infer<typeof IntentClassificationSchema>;
