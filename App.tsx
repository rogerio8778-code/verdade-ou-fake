import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, FileText, Image as ImageIcon, 
  Video as VideoIcon, Link as LinkIcon, PlusCircle, 
  AlertTriangle, Shield, CheckCircle2, XCircle, Info, Upload, Trash2, Layout
} from 'lucide-react';
import { InputType, AnalysisResult, VerdictStatus, UserAnalysisType } from './types';
import { processContent } from './services/geminiService';
import AnalysisView from './components/AnalysisView';
import { db, collection, addDoc, serverTimestamp } from './firebase'; // Importações do Firebase

const BrandedLoader = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = [
    "Coletando evidências…",
    "Lendo o conteúdo…",
    "Checando contexto…",
    "Buscando referências…",
    "Comparando versões…",
    "Gerando conclusão…"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B1F3A] flex flex-col items-center justify-center p-8 transition-opacity animate-in fade-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12)_0%,_transparent_70%)] pointer-events-none" />
      
      <div className="relative flex items-center justify-center mb-12">
        <div className="absolute w-[300px] h-[300px] flex items-center justify-center animate-[spin_20s_linear_infinite]">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 rounded-full"
              style={{
                transform: `rotate(${i * (360 / 14)}deg) translateY(-110px)`,
                backgroundColor: i % 3 === 0 ? '#93C5FD' : i % 3 === 1 ? '#60A5FA' : '#3B82F6',
                boxShadow: '0 0 15px rgba(147, 197, 253, 0.8)',
                opacity: 0.4 + (i / 14) * 0.6
              }}
            />
          ))}
        </div>

        <div className="absolute w-40 h-40 bg-blue-500/15 rounded-full animate-pulse-scale blur-xl" />
        
        <div className="relative animate-brand-pulse flex items-center justify-center">
          <div className="w-[100px] h-[100px] flex items-center justify-center bg-blue-600 rounded-[2rem] shadow-2xl border-2 border-blue-400/30">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-4 relative z-10">
        <h3 className="text-white text-3xl font-medium tracking-tight opacity-90 h-10 flex items-center justify-center min-w-[300px]">
          {phrases[phraseIndex]}
        </h3>
        <div className="flex flex-col items-center gap-1">
          <p className="text-blue-400/50 text-[9px] font-black uppercase tracking-[0.4em]">
            Motor v1.5.1 — Forense
          </p>
        </div>
      </div>

      <style>{`
        @keyframes brand-pulse {
          0%, 100% { transform: scale(0.96); }
          50% { transform: scale(1.04); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.4); opacity: 0.25; }
        }
        .animate-brand-pulse {
          animation: brand-pulse 3s ease-in-out infinite;
        }
        .animate-pulse-scale {
          animation: pulse-scale 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Novo estado para o tipo de análise selecionado
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<UserAnalysisType>(UserAnalysisType.FORENSIC);

  const [personalCount, setPersonalCount] = useState<number>(() => {
    const saved = localStorage.getItem('vof_personal_count');
    return saved ? parseInt(saved) : 0;
  });

  const [userId, setUserId] = useState<string>(''); // Novo estado para userId

  useEffect(() => {
    // Inicializa ou recupera o userId do localStorage
    let storedUserId = localStorage.getItem('vof_user_id');
    if (!storedUserId) {
        storedUserId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('vof_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  const generateHash = () => Math.random().toString(36).substring(2, 15).toUpperCase();

  const triggerReset = () => {
    setResult(null);
    setError(null);
  };

  const handleTabChange = (type: InputType) => {
    setInputType(type);
    setContent('');
    setMediaFiles([]);
    triggerReset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Novo handler para mudar o tipo de análise
  const handleAnalysisTypeChange = (type: UserAnalysisType) => {
    setSelectedAnalysisType(type);
    triggerReset(); // Reseta a análise anterior ao mudar o tipo
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerReset();
  };

  const isEvidenceValid = () => {
    if (inputType === InputType.TEXT) return content.length >= 40;
    if (inputType === InputType.IMAGE) return mediaFiles.length > 0;
    if (inputType === InputType.VIDEO) return mediaFiles.length > 0 || content.length >= 40;
    if (inputType === InputType.LINK) return content.includes('http');
    if (inputType === InputType.TEXT_IMAGE) return content.length >= 30 || mediaFiles.length > 0;
    return false;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => [...prev, {
          data: (reader.result as string).split(',')[1],
          mimeType: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    triggerReset();
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    triggerReset();
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const hash = generateHash();
      // Passa o selectedAnalysisType E userId para processContent
      const res = await processContent(content, inputType, mediaFiles, hash, false, selectedAnalysisType, userId);
      
      // Salvar a análise no Firestore
      if (userId) { // Garante que o userId está disponível
        const firestoreData = {
          userId: userId,
          analysisType: selectedAnalysisType, // Adiciona o tipo de análise
          entrada: { // Detalhes da entrada do usuário
            type: inputType,
            text: content,
            mediaCount: mediaFiles.length,
            mediaTypes: mediaFiles.map(f => f.mimeType)
          },
          resultado: res.conclusion, // A conclusão é o texto bruto completo da IA
          confianca: res.auditReliability,
          data: serverTimestamp() // Carimbo de data/hora do servidor do Firestore
        };
        await addDoc(collection(db, "analises"), firestoreData);
      }

      setResult(res);
      setPersonalCount(prev => {
        const next = prev + 1;
        localStorage.setItem('vof_personal_count', String(next));
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na auditoria.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing) return 'Auditoria em curso...';
    switch (selectedAnalysisType) {
      case UserAnalysisType.FACTUAL:
        return 'Iniciar Auditoria Factual';
      case UserAnalysisType.NARRATIVE:
        return 'Iniciar Auditoria Narrativa';
      case UserAnalysisType.FORENSIC:
      default:
        return 'Iniciar Auditoria Forense';
    }
  };

  if (result) {
    return (
      <AnalysisView 
        result={result} 
        onReset={() => setResult(null)} 
        userId={userId} // Passa userId
        engineVersion={result.engineVersion} // Passa versão do motor
        methodologyVersion={result.methodologyVersion} // Passa versão da metodologia
        rulesetId={result.rulesetId} // Passa ID do ruleset
        rulesetRevision={result.rulesetRevision} // Passa revisão do ruleset
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {isProcessing && <BrandedLoader />}
      
      <header className="bg-white border-b border-slate-100 p-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">VERDADE OU FAKE</h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">MOTOR DE AUDITORIA FORENSE</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">

        {/* Novo seletor de tipo de análise */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Tipo de Análise:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: UserAnalysisType.FACTUAL, label: 'Factual' },
              { id: UserAnalysisType.NARRATIVE, label: 'Narrativa' },
              { id: UserAnalysisType.FORENSIC, label: 'Forense' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => handleAnalysisTypeChange(type.id)}
                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedAnalysisType === type.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50">
            {[
              { id: InputType.TEXT, icon: FileText, label: 'Texto' },
              { id: InputType.IMAGE, icon: ImageIcon, label: 'Imagem' },
              { id: InputType.VIDEO, icon: VideoIcon, label: 'Vídeo' },
              { id: InputType.LINK, icon: LinkIcon, label: 'Link' },
              { id: InputType.TEXT_IMAGE, icon: Layout, label: 'Texto + Imagem' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as InputType)}
                className={`flex-1 flex flex-col items-center py-6 gap-2 transition-all ${
                  inputType === tab.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {inputType === InputType.LINK && (
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-900 font-medium">
                  Links de redes sociais costumam ser protegidos. Para melhor análise, anexe um print ou grave a tela.
                </p>
              </div>
            )}

            {(inputType === InputType.TEXT || inputType === InputType.LINK || inputType === InputType.TEXT_IMAGE || inputType === InputType.VIDEO) && (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {inputType === InputType.LINK ? 'Cole a URL suspeita:' : 'Descreva ou cole o conteúdo:'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={inputType === InputType.LINK ? 'https://...' : 'Cole aqui a mensagem suspeita ou descreva a situação...'}
                  className="w-full min-h-[160px] p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:ring-0 transition-all text-slate-800 font-medium text-lg placeholder:text-slate-300 resize-none"
                />
              </div>
            )}

            {(inputType === InputType.IMAGE || inputType === InputType.VIDEO || inputType === InputType.TEXT_IMAGE) && (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anexar Provas (Imagens/Vídeos):</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-blue-200 hover:text-blue-400 transition-all group"
                  >
                    <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload Mídia</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    multiple 
                    accept={inputType === InputType.IMAGE || inputType === InputType.TEXT_IMAGE ? "image/*" : "video/*,image/*"}
                  />
                  
                  {mediaFiles.map((file, i) => (
                    <div key={i} className="aspect-square rounded-[2.5rem] bg-slate-100 overflow-hidden relative group">
                      {file.mimeType.startsWith('image/') ? (
                        <img src={`data:${file.mimeType};base64,${file.data}`} className="w-full h-full object-cover" alt="Uploaded evidence" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                          <VideoIcon className="w-8 h-8" />
                        </div>
                      )}
                      <button 
                        onClick={() => removeFile(i)}
                        className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl flex items-center gap-3 text-red-600">
                <XCircle className="w-5 h-5" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button
              disabled={!isEvidenceValid() || isProcessing}
              onClick={handleAnalyze}
              className={`w-full py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
                isEvidenceValid() 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 active:scale-95' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Shield className="w-5 h-5" />
              {getButtonText()}
            </button>
          </div>
        </div>

        <section className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/5"><Info className="w-6 h-6 text-blue-400" /></div>
            <h4 className="text-xl font-black uppercase tracking-tighter">Como funciona?</h4>
          </div>
          <div className="grid gap-4">
            {[
              { icon: CheckCircle2, text: 'Análise de metadados e padrões de linguagem.' },
              { icon: CheckCircle2, text: 'Cruzamento com bases de dados governamentais e agências.' },
              { icon: CheckCircle2, text: 'Atribuição de registro forense único (FAC).' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 items-center">
                <step.icon className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-sm font-medium text-slate-300">{step.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-center py-8 opacity-20">
        <p className="text-[8px] font-black uppercase tracking-[0.5em]">v1.5.1 (Motor Anti-Manipulação) • verdadeoufake.app • neste aparelho: {personalCount}</p>
      </footer>
    </div>
  );
};

export default App;