import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { saveNPSFeedback } from '../services/feedbackService'; // Importar o serviço

interface FeedbackNPSProps {
  auditId: string;
  userId: string;
  engineVersion: string;
  methodologyVersion: string;
  rulesetId: string;
  rulesetRevision: number;
}

const FeedbackNPS: React.FC<FeedbackNPSProps> = ({ auditId, userId, engineVersion, methodologyVersion, rulesetId, rulesetRevision }) => {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Novo estado para evitar double submit

  useEffect(() => {
    // Reset state when component mounts (e.g., new analysis result)
    setScore(null);
    setComment('');
    setSubmitted(false);
    setIsSubmitting(false);
  }, [auditId]); // Depende do auditId para resetar

  const handleSubmit = async () => {
    if (score === null || isSubmitting) return; // Score is required, prevent double submit

    setIsSubmitting(true);
    console.log("[NPS] Enviando...", { score, hasComment: !!comment, auditId });

    try {
      const response = await saveNPSFeedback({
        score: score,
        comment: comment,
        auditId: auditId,
        userId: userId,
        engineVersion: engineVersion,
        methodologyVersion: methodologyVersion,
        rulesetId: rulesetId,
        rulesetRevision: rulesetRevision,
      });

      if (response.ok) {
        console.log("[NPS] Salvo com sucesso");
        // Save to localStorage as before (for client-side persistence)
        localStorage.setItem('vf_last_nps_score', String(score));
        localStorage.setItem('vf_last_nps_comment', comment);
        localStorage.setItem('vf_last_nps_date', new Date().toISOString());
        setSubmitted(true);
      } else {
        console.log("[NPS] Falhou ao salvar no Firestore");
        // Optionally, show a temporary error message to the user if saving failed.
        // For now, per requirements, just console.error.
      }
    } catch (error) {
      console.error("[NPS] Erro inesperado ao salvar feedback:", error);
      console.log("[NPS] Falhou ao salvar (exceção)");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2.5rem] text-center text-emerald-700 font-semibold shadow-sm no-print">
        Obrigado pelo feedback!
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6 no-print">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        Essa auditoria foi útil para você?
      </h4>
      <div className="flex justify-between gap-1 mb-4">
        {[...Array(11)].map((_, i) => (
          <button
            key={i}
            onClick={() => setScore(i)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all 
                        ${score === i ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            disabled={isSubmitting} // Desabilitar botões durante o envio
          >
            {i}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Quer nos dizer por quê? (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Seu comentário aqui..."
          rows={3}
          className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:ring-0 transition-all text-slate-800 font-medium text-sm placeholder:text-slate-300 resize-none"
          disabled={isSubmitting} // Desabilitar campo durante o envio
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={score === null || isSubmitting} // Desabilitar botão de envio
        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all 
                    ${(score !== null && !isSubmitting) ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
      >
        <Send className="w-3 h-3" />
        {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
      </button>
    </div>
  );
};

export default FeedbackNPS;