import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { ConversationService } from './strategic';
import { AiChatRequestDto } from './dto/chat-request.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat')
  async chat(@Body() dto: AiChatRequestDto) {
    if (dto.sessionId?.trim()) {
      const data = await this.conversationService.runStrategicTurn(
        dto.sessionId.trim(),
        dto.message,
        dto.history,
        dto.selectedProposal ?? undefined,
        dto.attachedContent,
      );
      return {
        success: true,
        data: {
          mode: data.mode,
          reply: data.reply,
          questions: data.questions,
          conversationState: data.conversationState,
          completenessScore: data.completenessScore,
          proposals: data.proposals,
          roadmap: data.roadmap,
          selectedProject: data.selectedProject,
          introMessage: data.introMessage,
          frontendHint: data.frontendHint,
        },
      };
    }
    const data = await this.aiService.runTurn(
      dto.message,
      dto.history,
      dto.selectedProposal ?? undefined,
      dto.attachedContent,
    );
    return { success: true, data };
  }

  @Post('chat/stream')
  async chatStream(@Body() dto: AiChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const flush = (res as unknown as { flush?: () => void }).flush?.bind(res);

    try {
      if (dto.sessionId?.trim()) {
        const data = await this.conversationService.runStrategicTurn(
          dto.sessionId.trim(),
          dto.message,
          dto.history,
          dto.selectedProposal ?? undefined,
          dto.attachedContent,
        );
        const payload = `event: complete\ndata: ${JSON.stringify({
          mode: data.mode,
          reply: data.reply,
          questions: data.questions,
          conversationState: data.conversationState,
          completenessScore: data.completenessScore,
          proposals: data.proposals,
          roadmap: data.roadmap,
          selectedProject: data.selectedProject,
          introMessage: data.introMessage,
          frontendHint: data.frontendHint,
        })}\n\n`;
        res.write(payload);
        if (flush) flush();
      } else {
        for await (const event of this.aiService.runTurnStream(
          dto.message,
          dto.history,
          dto.selectedProposal ?? undefined,
          dto.attachedContent,
        )) {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          res.write(payload);
          if (flush) flush();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      if (flush) flush();
    } finally {
      res.end();
    }
  }
}
