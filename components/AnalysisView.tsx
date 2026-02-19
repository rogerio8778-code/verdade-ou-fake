

import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult, VerdictStatus } from '../types';
import { 
  ArrowLeft, Share2, ShieldCheck, CheckCircle2, 
  AlertCircle, XCircle, ExternalLink, Globe, 
  Landmark, Clock, Info, HelpCircle, Users, TrendingUp, Copy, Check, Fingerprint
} from 'lucide-react';
import html2canvas from 'html2canvas';
import ShareCard from './ShareCard';
import FeedbackNPS from './FeedbackNPS'; // Importar o novo componente

interface Props {
  result: AnalysisResult;
  onReset: () => void;
  userId: string; // Adicionado userId
  engineVersion: string; // Adicionado
  methodologyVersion: string; // Adicionado
  rulesetId: string; // Adicionado
  rulesetRevision: number; // Adicionado
}

const AnalysisView: React.FC<Props> = ({ result, onReset, userId, engineVersion, methodologyVersion, rulesetId, rulesetRevision }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const buildShareText = (res: AnalysisResult) => {
    return `🛡️ Verdade ou Fake — Auditoria Forense\n` +
           `🔍 Veredito: ${res.verdict.replace(/_/g, ' ')}\n` +
           `📊 Confiança Técnica: ${res.auditReliability}%\n` +
           `📋 FAC: ${res.fac}\n` +
           `🆔 ID da auditoria: ${res.auditId}\n` +
           `📝 Resumo: ${res.conclusion}\n\n` +
           `🌐 verdadeoufake.app`;
  };

  const handleTextShare = async () => {
    const shareText = buildShareText(result);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Verdade ou Fake', text: shareText });
        return;
      } catch (e) { console.debug('Share cancelled or failed', e); }
    }
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        prompt("Copie o texto da auditoria:", shareText);
      }
    } catch (e) {
      prompt("Copie o texto da auditoria:", shareText);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.share) {
        const file = new File([blob], `auditoria_${result.auditId}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Relatório de Auditoria v1.5.1' });
      } else if (blob) {
        const link = document.createElement('a');
        link.download = `auditoria_${result.auditId}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    } catch (e) { console.error(e); } finally { setIsSharing(false); }
  };

  const copyFAC = () => {
    navigator.clipboard.writeText(`FAC [${result.auditId}]: ${result.fac}\nVeredito: ${result.verdict}\nVerificado em verdadeoufake.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = (() => {
    const v = result.verdict;
    if (v === 'VERDADEIRO_COM_FONTE' || v === 'DADO_DECLARADO_COM_FONTE') return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', fill: 'bg-emerald-500', Icon: CheckCircle2 };
    if (v === 'VERDADEIRO_IMPRECISO') return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', fill: 'bg-amber-500', Icon: AlertCircle };
    if (v === 'DISTORCIDO') return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-500', fill: 'bg-orange-500', Icon: AlertCircle };
    if (v === 'FALSO') return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500', fill: 'bg-red-500', Icon: XCircle };
    return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', fill: 'bg-slate-400', Icon: HelpCircle };
  })();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans">
      <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 sticky top-0 z-50 no-print">
        <button onClick={onReset} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Nova Auditoria
        </button>
        <div className="flex flex-col items-end">
          <div className="bg-slate-900 text-white px-3 py-1 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[8px] font-black uppercase tracking-widest">Motor v1.5.1</span>
          </div>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">
            Lente Analítica: {result.analysisLens}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto w-full px-5 py-8 space-y-8">
        {/* EVIDÊNCIA ANALISADA */}
        <section className="bg-white border-l-8 border-slate-900 p-6 rounded-r-[2rem] shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidência Analisada:</p>
          {result.evidencePreview.mediaUrls && result.evidencePreview.mediaUrls.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {result.evidencePreview.mediaUrls.map((url, i) => (
                <img key={i} src={url} className="h-32 rounded-xl object-cover border border-slate-100" alt="Mídia analisada" />
              ))}
            </div>
          ) : (
            <p className="text-slate-800 font-bold italic text-lg leading-tight">"{result.evidencePreview.textSnippet}..."</p>
          )}
        </section>

        {/* VEREDITO E CONFIABILIDADE */}
        <div className={`${config.bg} ${config.border} border-[4px] rounded-[4rem] p-10 text-center shadow-2xl space-y-6`}>
          <div className="flex justify-center">
            <div className={`${config.fill} p-6 rounded-full shadow-lg ring-8 ring-white`}>
              <config.Icon className="w-16 h-16 text-white" />
            </div>
          </div>
          <h2 className={`text-2xl font-black uppercase tracking-tighter leading-none ${config.color}`}>
            {result.verdict.replace(/_/g, ' ')}
          </h2>
          
          <div className="space-y-2">
             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Confiabilidade da Auditoria</span>
                <span className="text-slate-900">{result.auditReliability}%</span>
             </div>
             <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${result.auditReliability}%` }} />
             </div>
             <p className="text-[8px] text-slate-400 italic">Mede a qualidade e completude da evidência acessada.</p>
          </div>
        </div>

        {/* FAC */}
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fato Atômico Canônico (FAC):</span>
          <p className="text-lg font-bold italic text-slate-900 leading-tight">"{result.fac}"</p>
          <div className="flex flex-col items-start gap-2">
            <button onClick={copyFAC} className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Copiar Registro Forense'}
            </button>
            {result.analysisLens === "POLITICO" && (
              <button className="mt-2 text-[10px] uppercase tracking-widest text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Ver análise política
              </button>
            )}
          </div>
        </div>

        {/* MÉTRICAS GRID */}
        <section className="grid grid-cols-2 gap-4">
           {[
             { label: 'Factualidade', val: result.factuality, icon: Landmark },
             { label: 'Ranking Fontes', val: `Nível ${result.sourceRank}`, icon: Globe },
             { label: 'Temporalidade', val: result.temporality, icon: Clock },
             { label: 'Carga Opinativa', val: result.opinionLoad, icon: Info },
           ].map((item, i) => (
             <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <item.icon className="w-4 h-4 text-blue-600 mb-2" />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-black text-slate-900">{item.val}</p>
             </div>
           ))}
        </section>

        {/* INTERESSES EGrounding */}
        <section className="bg-slate-900 text-white rounded-[3.5rem] p-8 space-y-8 shadow-2xl overflow-hidden relative">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Interesses Prováveis</h3>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Análise Neutra v1.5.1</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.interests.map((tag, i) => (
              <span key={i} className="bg-white/10 text-white text-[10px] font-bold px-4 py-2 rounded-full border border-white/5">
                {tag}
              </span>
            ))}
          </div>
          <div className="pt-6 border-t border-white/10">
            <p className="text-sm font-medium leading-relaxed text-slate-300">{result.conclusion}</p>
          </div>
        </section>

        {/* NOVO BLOCO DE FEEDBACK NPS */}
        <FeedbackNPS 
          auditId={result.auditId}
          userId={userId}
          engineVersion={engineVersion}
          methodologyVersion={methodologyVersion}
          rulesetId={rulesetId}
          rulesetRevision={rulesetRevision}
        />

        {/* FONTES */}
        {result.topSources.length > 0 && (
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Fontes da Auditoria (Top 3)</h4>
            <div className="space-y-2">
              {result.topSources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 truncate max-w-[200px]">{s.title}</span>
                    <span className="text-[8px] text-slate-400 uppercase font-mono">{s.isOfficial ? 'Órgão Oficial' : 'Imprensa'}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleShare} disabled={isSharing} className="bg-slate-900 text-white font-black py-7 rounded-[3rem] shadow-xl flex items-center justify-center gap-3 active:scale-95">
              <Share2 className="w-5 h-5" /> 
              <span className="text-[10px] uppercase tracking-widest">Compartilhar Card</span>
            </button>
            <button onClick={onReset} className="bg-white text-slate-900 border-4 border-slate-100 font-black py-7 rounded-[3rem] shadow-sm flex items-center justify-center gap-3">
               <ArrowLeft className="w-5 h-5" />
               <span className="text-[10px] uppercase tracking-widest">Nova Análise</span>
            </button>
          </div>
          <button 
            onClick={handleTextShare}
            className="w-full bg-blue-600 text-white font-black py-7 rounded-[3rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-widest">
              {shareCopied ? 'Relatório Copiado ✅' : 'Compartilhar relatório técnico'}
            </span>
          </button>
        </div>

        <div className="absolute left-[-9999px]">
           <ShareCard cardRef={cardRef} result={result} />
        </div>
      </main>
    </div>
  );
};

export default AnalysisView;