export interface Gem {
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
  meta?: {
    jobId?: string | null;
    title?: string;
    company?: string;
    url?: string;
    timestamp?: number;
  };
}

export interface SkillData {
  hard: Map<string, number>;
  soft: Map<string, number>;
}

export type SkillCategory = 'hard' | 'soft';

export interface SkillNode {
  id: string;
  type: SkillCategory;
  count: number;
}

export interface SkillLink {
  source: string;
  target: string;
  strength: number;
}

export interface SkillGalaxyData {
  nodes: SkillNode[];
  links: SkillLink[];
}

