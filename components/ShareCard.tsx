
import React from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react';

interface Props {
  result: AnalysisResult;
  cardRef: React.RefObject<HTMLDivElement>;
}

const ShareCard: React.FC<Props> = ({ result, cardRef }) => {
  const style = (() => {
    const v = result.verdict;
    if (v === 'VERDADEIRO_COM_FONTE' || v === 'DADO_DECLARADO_COM_FONTE') return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-500', fill: 'bg-emerald-500', Icon: CheckCircle2 };
    if (v === 'FALSO') return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-600', fill: 'bg-red-600', Icon: XCircle };
    return { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-500', fill: 'bg-slate-500', Icon: AlertCircle };
  })();

  return (
    <div 
      ref={cardRef}
      className="bg-white rounded-[40px] shadow-2xl overflow-hidden font-sans flex flex-col w-[450px] relative p-1"
      style={{ minHeight: '1150px' }}
    >
      <div className="bg-slate-900 px-8 py-10 text-center">
        <ShieldCheck className="w-10 h-10 text-blue-400 mx-auto mb-2" />
        <h2 className="text-[14px] font-black text-white tracking-[0.4em] uppercase">VERDADE OU FAKE</h2>
        <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest mt-1">MOTOR FORENSE v1.5.1</p>
      </div>

      <div className="p-10 space-y-6 flex-grow flex flex-col">
        {/* EVIDÊNCIA */}
        <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-6">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-4">Evidência Analisada:</span>
           {result.evidencePreview.mediaUrls && result.evidencePreview.mediaUrls.length > 0 ? (
             <img src={result.evidencePreview.mediaUrls[0]} className="w-full h-40 object-cover rounded-2xl border border-slate-200" alt="Evidência" />
           ) : (
             <p className="text-[14px] font-bold italic text-slate-800 leading-tight">"{result.evidencePreview.textSnippet}..."</p>
           )}
        </div>

        {/* VEREDITO */}
        <div className={`rounded-[3rem] p-8 ${style.bg} border-[4px] ${style.border} text-center flex flex-col items-center gap-4`}>
           <div className={`${style.fill} p-4 rounded-full shadow-lg ring-6 ring-white`}>
             <style.Icon className="w-10 h-10 text-white" />
           </div>
           <h3 className={`text-[22px] font-black uppercase tracking-tighter ${style.color}`}>
             {result.verdict.replace(/_/g, ' ')}
           </h3>
           <div className="w-full space-y-1">
             <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
               <span>Confiabilidade</span>
               <span>{result.auditReliability}%</span>
             </div>
             <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
               <div className="h-full bg-blue-500" style={{ width: `${result.auditReliability}%` }} />
             </div>
           </div>
        </div>

        {/* FAC */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fato Atômico Canônico:</span>
           <p className="text-[16px] font-bold italic text-slate-900 leading-tight">"{result.fac}"</p>
        </div>

        {/* INFOS GRID */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900 p-5 rounded-[2rem] text-white">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest block mb-1">Ranking Fontes</span>
              <p className="text-[12px] font-black uppercase">Nível {result.sourceRank}</p>
           </div>
           <div className="bg-slate-900 p-5 rounded-[2rem] text-white">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest block mb-1">Factualidade</span>
              <p className="text-[12px] font-black uppercase">{result.factuality}</p>
           </div>
        </div>

        {/* INTERESSES */}
        <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border-2 border-blue-100 flex-grow">
           <div className="flex items-center gap-2 mb-4">
             <TrendingUp className="w-4 h-4 text-blue-600" />
             <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Interesses Identificados</span>
           </div>
           <div className="flex flex-wrap gap-2 mb-4">
             {result.interests.map((tag, i) => (
               <span key={i} className="bg-white text-slate-900 text-[9px] font-black px-4 py-2 rounded-full border border-blue-100 shadow-sm uppercase">
                 {tag}
               </span>
             ))}
           </div>
           <p className="text-[10px] font-medium leading-tight text-slate-600 italic">
             {result.conclusion}
           </p>
        </div>

        <div className="pt-6 border-t-2 border-dashed border-slate-100 flex justify-between items-center text-[9px] font-black">
           <span className="text-slate-400 uppercase">AUDIT_ID: {result.auditId}</span>
           <span className="text-blue-600 uppercase">verdadeoufake.app</span>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;