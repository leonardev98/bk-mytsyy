import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  ConversationService,
  EmbeddingService,
  QuestioningEngineService,
  RedisMemoryService,
  ScoringService,
  StateMachineService,
} from './strategic';
import { IntentDetectionService } from './strategic/intent-detection/intent-detection.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    RedisMemoryService,
    StateMachineService,
    ScoringService,
    EmbeddingService,
    QuestioningEngineService,
    IntentDetectionService,
    ConversationService,
  ],
  exports: [AiService, ConversationService],
})
export class AiModule {}
