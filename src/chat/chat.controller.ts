import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  getInitialMessages() {
    return this.chatService.getInitialMessages();
  }

  @Post()
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(dto.content);
  }
}
