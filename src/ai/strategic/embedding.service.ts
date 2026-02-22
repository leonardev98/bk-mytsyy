import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';

/**
 * Genera embeddings y calcula similitud para anti-redundancia semántica.
 */
@Injectable()
export class EmbeddingService {
  private readonly embeddings: OpenAIEmbeddings | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    this.embeddings = apiKey
      ? new OpenAIEmbeddings({
          openAIApiKey: apiKey,
          modelName: this.config.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        })
      : null;
  }

  isAvailable(): boolean {
    return this.embeddings != null;
  }

  /**
   * Genera embedding para un texto. Si no hay API key, devuelve array vacío (no se bloquean preguntas).
   */
  async embed(text: string): Promise<number[]> {
    if (!this.embeddings || !text?.trim()) return [];
    const vectors = await this.embeddings.embedDocuments([text.trim()]);
    return vectors[0] ?? [];
  }

  /**
   * Similitud coseno entre dos vectores. 1 = idénticos, 0 = ortogonales.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * True si existe al menos un embedding en la lista con similitud > threshold.
   */
  isTooSimilarToExisting(
    newEmbedding: number[],
    existingEmbeddings: number[][],
    threshold: number,
  ): boolean {
    if (newEmbedding.length === 0 || existingEmbeddings.length === 0) return false;
    for (const existing of existingEmbeddings) {
      if (this.cosineSimilarity(newEmbedding, existing) > threshold) return true;
    }
    return false;
  }
}
