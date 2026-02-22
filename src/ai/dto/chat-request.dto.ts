import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationTurnDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class AiChatRequestDto {
  /**
   * Si se envía, se usa el agente estratégico con memoria en Redis y state machine.
   * Si no se envía, se usa el flujo legacy (solo LLM por turno).
   */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  /** Últimos mensajes de la conversación para que la IA detecte el modo. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  history?: ConversationTurnDto[];

  /** Cuando el usuario eligió una propuesta (modo EXECUTION), enviar la seleccionada. */
  @IsOptional()
  selectedProposal?: { title?: string; pitch?: string; whyItWins?: string } | null;

  /**
   * Contenido extraído de un archivo adjunto (PDF, TXT, Word).
   * Si el usuario sube su proyecto/idea en un documento, el frontend envía aquí el texto.
   * El backend responde con EXECUTION directo (roadmap 30 días), sin preguntas ni 3 propuestas.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  attachedContent?: string;
}
