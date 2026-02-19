import { GoogleGenAI } from "@google/genai";
console.log("ENV GEMINI:", import.meta.env.VITE_GEMINI_API_KEY);
import { AnalysisResult, InputType, VerdictStatus, SourceRank, GroundingSource, UserAnalysisType, AnalysisLens } from "../types";
import { saveNPSFeedback } from "./feedbackService"; // Importar o serviço de feedback

// A) ENGINE_PROFILE - Metadados internos do motor v1.5.1
const ENGINE_PROFILE = {
  engineVersion: "1.5.1",
  methodologyVersion: "1.5.1-m1",
  lastRulesUpdateISO: "2024-05-20T12:00:00Z",
  schemaVersion: "result-v1"
};

// C) RULESET - Definição de regras de auditoria (mantido, mas com relevância reduzida sem parsing estruturado)
const RULESET = {
  rulesetId: "canon-core",
  rulesetRevision: 1
};

/**
 * C) applyRuleset - Função interna para ajuste de consistência e fallback
 * E) Fallback conservador: Vereditos inconclusivos se a confiança for insuficiente.
 * (A lógica aqui terá menos impacto, já que os valores virão de defaults ou interpretação básica)
 */
const applyRuleset = (draft: AnalysisResult): AnalysisResult => {
  console.debug(`[ENGINE] Executing Ruleset: ${RULESET.rulesetId} (Rev: ${RULESET.rulesetRevision})`);
  console.debug(`[ENGINE] Profile: v${ENGINE_PROFILE.engineVersion} / Methodology: ${ENGINE_PROFILE.methodologyVersion}`);

  // Se a confiança for baixa (< 45), não permite vereditos afirmativos.
  // Note: Com texto puro, a 'verdict' e 'auditReliability' serão padrões, então esta regra terá efeito limitado.
  if (draft.auditReliability < 45) {
    if (draft.verdict === 'VERDADEIRO_COM_FONTE' || draft.verdict === 'DADO_DECLARADO_COM_FONTE') {
      draft.verdict = 'NAO_VERIFICAVEL';
    }
  }

  // Garantia de que FALSO nunca tenha confiança excessivamente baixa se houver evidência de mentira
  if (draft.verdict === 'FALSO' && draft.auditReliability < 60) {
    draft.auditReliability = 60;
  }

  return draft;
};

export const processContent = async (
  content: string,
  inputType: InputType,
  mediaParts?: { data: string; mimeType: string }[],
  externalHash?: string,
  forceAnalysis?: boolean,
  analysisType: UserAnalysisType = UserAnalysisType.FORENSIC, // Novo parâmetro com valor padrão
  userId?: string // Adicionado parâmetro userId
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});
  const model = "gemini-2.5-flash"; 

  // MODIFICADO: systemInstruction para suportar múltiplos tipos de análise
  let systemInstruction = `Você é o MOTOR FORENSE DO APLICATIVO "VERDADE OU FAKE".

Sua função é analisar conteúdos (texto, imagem, vídeo ou URL) com rigor técnico, neutralidade política e metodologia verificável.

O usuário informará um tipo de análise:

analysisType = "${analysisType}"

Responda de acordo com o tipo solicitado.
`;

  if (analysisType === UserAnalysisType.FACTUAL) {
    systemInstruction += `
SE analysisType = "factual"

Objetivo:
Verificar apenas a existência objetiva do fato.

Critérios:
- O evento ocorreu?
- Há registro histórico?
- Há prova documental?
- Há confirmação independente?

Resposta deve conter:

VEREDITO FACTUAL: (VERDADEIRO / FALSO / NÃO COMPROVADO)

PROVAS:
- evidências conhecidas
- registros históricos
- fontes verificáveis

LIMITE DA EVIDÊNCIA:
- o que não pode ser afirmado

Não inclua opinião nem análise narrativa.
`;
  } else if (analysisType === UserAnalysisType.NARRATIVE) {
    systemInstruction += `
SE analysisType = "narrative"

Objetivo:
Avaliar como o fato está sendo usado.

Critérios:
- Há manipulação de contexto?
- Há recorte seletivo?
- Há exagero interpretativo?
- Há narrativa política ou emocional?

Resposta deve conter:

USO DO FATO: (FIEL / MANIPULADO / DISTORCIDO)

TÉCNICAS IDENTIFICADAS:
- omissão de contexto
- amplificação
- framing emocional
- comparação enganosa

IMPACTO NARRATIVO:
- como a mensagem influencia a percepção

Não julgue se o fato aconteceu, apenas como foi usado.
`;
  } else if (analysisType === UserAnalysisType.FORENSIC) {
    systemInstruction += `
SE analysisType = "forensic"

Objetivo:
Gerar análise completa multidimensional.

Critérios:
- factualidade
- narrativa
- confiabilidade da fonte
- intenção implícita
- impacto social

Resposta deve conter:

VEREDITO FINAL: (VERDADEIRO / FALSO / PARCIAL / MANIPULADO / MISTO)

CONFIABILIDADE ESTIMADA: percentual técnico

FATO ATÔMICO CANÔNICO (FAC):
- descrição objetiva do que ocorreu

ANÁLISE NARRATIVA:
- uso do fato

RANKING DE FONTES:
- primária / secundária / opinativa / desconhecida

INTERESSES IDENTIFICADOS:
- político / econômico / ideológico / social / nenhum detectado

LIMITE DA EVIDÊNCIA:
- incertezas reais
`;
  }

  systemInstruction += `
REGRAS GERAIS:

- Nunca invente fatos
- Nunca atribua intenção sem evidência contextual
- Diferencie fato de interpretação
- Seja técnico, claro e imparcial
- Evite linguagem ideológica
- Não adote tom militante
- Seu papel é pericial, não opinativo

Responder apenas com a análise.
`;


  const promptParts: any[] = [];
  
  if (mediaParts && mediaParts.length > 0) {
    mediaParts.forEach(part => {
      promptParts.push({ inlineData: { data: part.data, mimeType: part.mimeType } });
    });
  }

  promptParts.push({ text: `
    ID Auditoria: ${externalHash}
    Input: ${inputType}
    Tipo de Análise Solicitado: ${analysisType}
    Conteúdo: ${content || 'Análise baseada em mídia anexada'}
    Force Analysis: ${forceAnalysis ? 'Sim' : 'Não'}
    
    Analise as evidências seguindo as três camadas forenses (se Forense) ou os critérios específicos do tipo de análise "${analysisType}". Forneça um resumo direto do veredito e dos fatos principais.
  `});

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: promptParts },
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.1
    }
  });

  const rawAiOutput = response.text || "Nenhuma resposta textual foi gerada pelo modelo.";

  const requestId = externalHash || Math.random().toString(36).substring(2, 15).toUpperCase();

  // Mapear UserAnalysisType para AnalysisLens
  let detectedAnalysisLens: AnalysisLens;
  if (analysisType === UserAnalysisType.FACTUAL) {
    detectedAnalysisLens = 'FACTUAL';
  } else if (analysisType === UserAnalysisType.NARRATIVE) {
    detectedAnalysisLens = 'NARRATIVO';
  } else {
    detectedAnalysisLens = 'FORENSE'; // Default para FORENSIC
  }


  let draftResult: AnalysisResult = {
    auditId: requestId,
    requestId: requestId,
    inputType: inputType,
    analysisLens: detectedAnalysisLens, // Usa o analysisType como lente
    evidencePreview: {
      textSnippet: content?.substring(0, 200),
      mediaUrls: mediaParts?.map(m => `data:${m.mimeType};base64,${m.data}`)
    },
    fac: '', // Inicializa vazio, será preenchido abaixo
    verdict: 'NAO_VERIFICAVEL',
    auditReliability: 50,
    factuality: 'Baixa',
    temporality: 'Parcial',
    opinionLoad: 'Média',
    sourceRank: 'C (SECUNDÁRIO)',
    topSources: [],
    interests: ['Análise Geral'],
    conclusion: rawAiOutput,
    forensicHash: Math.random().toString(36).substring(2, 15).toUpperCase(),
    timestamp: new Date().toISOString(),
    // Popula os novos campos de versão do motor e regras
    engineVersion: ENGINE_PROFILE.engineVersion,
    methodologyVersion: ENGINE_PROFILE.methodologyVersion,
    rulesetId: RULESET.rulesetId,
    rulesetRevision: RULESET.rulesetRevision,
  };

  const lowerCaseOutput = rawAiOutput.toLowerCase();

  // Tentativa de extrair FAC (Fato Atômico Canônico) se disponível
  const facMatch = rawAiOutput.match(/FATO ATÔMICO CANÔNICO \(FAC\):(.*)/i);
  if (facMatch && facMatch[1]) {
    draftResult.fac = facMatch[1].trim();
  } else {
    draftResult.fac = rawAiOutput.split('\n')[0].substring(0, 200) + '...'; // Fallback
  }

  // Refinar extração de vereditos e confiabilidade com base no tipo de análise
  if (analysisType === UserAnalysisType.FACTUAL) {
    if (lowerCaseOutput.includes('veredicto factual: verdadeiro')) {
      draftResult.verdict = 'VERDADEIRO_COM_FONTE';
      draftResult.auditReliability = 85;
      draftResult.factuality = 'Alta';
    } else if (lowerCaseOutput.includes('veredicto factual: falso')) {
      draftResult.verdict = 'FALSO';
      draftResult.auditReliability = 80;
      draftResult.factuality = 'Alta';
    } else if (lowerCaseOutput.includes('veredicto factual: não comprovado')) {
      draftResult.verdict = 'NAO_VERIFICAVEL';
      draftResult.auditReliability = 60;
      draftResult.factuality = 'Média';
    }
  } else if (analysisType === UserAnalysisType.NARRATIVE) {
    if (lowerCaseOutput.includes('uso do fato: fiel')) {
      draftResult.verdict = 'VERDADEIRO_COM_FONTE'; // Mapeado para o mais próximo
      draftResult.auditReliability = 70;
      draftResult.opinionLoad = 'Baixa';
    } else if (lowerCaseOutput.includes('uso do fato: manipulado') || lowerCaseOutput.includes('uso do fato: distorcido')) {
      draftResult.verdict = 'DISTORCIDO';
      draftResult.auditReliability = 75;
      draftResult.opinionLoad = 'Elevada';
    }
  } else if (analysisType === UserAnalysisType.FORENSIC) {
    if (lowerCaseOutput.includes('veredicto final: verdadeiro')) {
      draftResult.verdict = 'VERDADEIRO_COM_FONTE';
      draftResult.auditReliability = 90;
      draftResult.factuality = 'Alta';
    } else if (lowerCaseOutput.includes('veredicto final: falso')) {
      draftResult.verdict = 'FALSO';
      draftResult.auditReliability = 85;
      draftResult.factuality = 'Alta';
    } else if (lowerCaseOutput.includes('veredicto final: parcial')) {
      draftResult.verdict = 'VERDADEIRO_IMPRECISO';
      draftResult.auditReliability = 70;
      draftResult.factuality = 'Média';
    } else if (lowerCaseOutput.includes('veredicto final: manipulado')) {
      draftResult.verdict = 'DISTORCIDO';
      draftResult.auditReliability = 75;
      draftResult.factuality = 'Média';
      draftResult.opinionLoad = 'Elevada';
    } else if (lowerCaseOutput.includes('veredicto final: misto')) {
      draftResult.verdict = 'NAO_VERIFICAVEL';
      draftResult.auditReliability = 65;
      draftResult.factuality = 'Baixa';
    }
  }
  
  // Tentar extrair CONFIABILIDADE ESTIMADA
  const reliabilityMatch = rawAiOutput.match(/CONFIABILIDADE ESTIMADA: (\d+)%?/i);
  if (reliabilityMatch && reliabilityMatch[1]) {
      const parsedReliability = parseInt(reliabilityMatch[1]);
      if (!isNaN(parsedReliability) && parsedReliability >= 0 && parsedReliability <= 100) {
          draftResult.auditReliability = parsedReliability;
      }
  }

  let result = applyRuleset(draftResult);
  
  // Adicionar chamada assíncrona NÃO BLOQUEANTE para salvar o feedback NPS (telemetria)
  saveNPSFeedback({
    score: null, // Como é um log automático, o score é nulo
    comment: "auto-log",
    auditId: result.auditId ?? "no-id",
    userId: userId ?? null,
    engineVersion: ENGINE_PROFILE?.engineVersion ?? null,
    methodologyVersion: ENGINE_PROFILE?.methodologyVersion ?? null,
    rulesetId: RULESET?.rulesetId ?? null,
    rulesetRevision: RULESET?.rulesetRevision ?? null
  }).catch((e) => console.error("Erro salvando auto-log NPS:", e)); // Captura erros silenciosamente

  return result;
};