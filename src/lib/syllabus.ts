import type { AssessmentType } from './types';
import type { SyllabusTiming } from './syllabus-schedule';

export interface SyllabusSuggestion {
  name: string;
  type: AssessmentType;
  date: string;
  time: string;
  weight: number | null;
  source: string;
  page?: number | null;
  warnings: string[];
  grouped: boolean;
  timing?: SyllabusTiming | null;
  durationMinutes?: number | null;
  tentative?: boolean;
}

export const assessmentNameKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
