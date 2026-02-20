import { Injectable } from '@nestjs/common';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@Injectable()
export class ChatService {
  getInitialMessages(): ChatMessage[] {
    return [
      {
        id: '0',
        role: 'assistant',
        content: 'Hola 👋 Cuando quieras, cuéntame en qué andas o qué te gustaría crear.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async sendMessage(userContent: string): Promise<ChatMessage> {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Entendido. Has dicho: "${userContent}". En el MVP completo aquí responderé con análisis y próximos pasos para tu idea. Por ahora puedes seguir escribiendo y afinando tu idea.`,
      createdAt: new Date().toISOString(),
    };
  }
}
