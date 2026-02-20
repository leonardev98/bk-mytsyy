import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { AiChatRequestDto } from './dto/chat-request.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() dto: AiChatRequestDto) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      if (flush) flush();
    } finally {
      res.end();
    }
  }
}
