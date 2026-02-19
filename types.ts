

export enum InputType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  TEXT_IMAGE = 'text_image'
}

export enum UserAnalysisType {
  FACTUAL = 'factual',
  NARRATIVE = 'narrative',
  FORENSIC = 'forensic'
}

export type VerdictStatus = 
  | 'VERDADEIRO_COM_FONTE'
  | 'VERDADEIRO_IMPRECISO'
  | 'DISTORCIDO'
  | 'FALSO'
  | 'NAO_VERIFICAVEL'
  | 'PRECISA_EVIDENCIA'
  | 'DADO_DECLARADO_COM_FONTE';

export type SourceRank = string;

export type AnalysisLens = 'FORENSE' | 'FACTUAL' | 'ESTATISTICO' | 'POLITICO' | 'NARRATIVO';

export interface GroundingSource {
  title: string;
  uri: string;
  isOfficial?: boolean;
}

export interface Lead {
  email: string;
  timestamp: string;
}

export interface AnalysisResult {
  auditId: string;
  requestId: string;
  inputType: InputType;
  analysisLens: AnalysisLens;
  evidencePreview: {
    textSnippet?: string;
    mediaUrls?: string[];
    mimeType?: string;
  };
  fac: string; // Fato Atômico Canônico
  verdict: VerdictStatus;
  auditReliability: number; // 0-100
  factuality: 'Alta' | 'Média' | 'Baixa';
  temporality: 'Atual' | 'Antiga' | 'Parcial';
  opinionLoad: 'Baixa' | 'Média' | 'Elevada';
  sourceRank: SourceRank;
  topSources: GroundingSource[];
  interests: string[];
  conclusion: string;
  forensicHash: string;
  timestamp: string;
  // Novos campos para metadados do motor/regras
  engineVersion: string;
  methodologyVersion: string;
  rulesetId: string;
  rulesetRevision: number;
}