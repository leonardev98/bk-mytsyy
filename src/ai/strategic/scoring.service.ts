import { Injectable } from '@nestjs/common';
import {
  type BusinessContext,
  REQUIRED_CONTEXT_FIELDS,
} from './interfaces/conversation-state.interface';

const POINTS_PER_FIELD = 20;
const MAX_SCORE = 100;

@Injectable()
export class ScoringService {
  /**
   * Calcula el completeness score (0–100) según campos obligatorios.
   * Cada campo no nulo y no vacío = +20.
   */
  compute(businessContext: BusinessContext): number {
    let filled = 0;
    for (const field of REQUIRED_CONTEXT_FIELDS) {
      const value = businessContext[field];
      if (value != null && String(value).trim() !== '') {
        filled += 1;
      }
    }
    return Math.min(filled * POINTS_PER_FIELD, MAX_SCORE);
  }

  /**
   * Indica si el score permite pasar a DEFINITION (60–80) o STRATEGY (>= 80).
   */
  getPhaseFromScore(score: number): 'EXPLORATION' | 'DEFINITION' | 'STRATEGY' {
    if (score >= 80) return 'STRATEGY';
    if (score >= 60) return 'DEFINITION';
    return 'EXPLORATION';
  }
}
