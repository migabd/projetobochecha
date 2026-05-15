import React, { useState } from 'react';

const ReverseAnalysisTab = ({ db, setDb, showAlert, callIA }) => {
    const [reverseAnalysis, setReverseAnalysis] = useState({
        bancaName: '',
        files: [],
        isAnalyzing: false,
        result: '',
        history: db.reverseAnalysisHistory || []
    });

    const compressImage = (base64Str) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    };

    const handleReverseFiles = (e) => {
        const fileList = Array.from(e.target.files);
        if (!fileList.length) return;
        const readers = fileList.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                let b64 = ev.target.result;
                let mime = file.type || 'application/octet-stream';
                if (mime.startsWith('image/')) b64 = await compressImage(b64);
                resolve({ name: file.name, data: b64, mimeType: mime });
            };
            reader.readAsDataURL(file);
        }));
        Promise.all(readers).then(results => {
            setReverseAnalysis(p => ({ ...p, files: [...p.files, ...results] }));
        });
        e.target.value = '';
    };

    const removeReverseFile = (idx) => {
        setReverseAnalysis(p => ({ ...p, files: p.files.filter((_, i) => i !== idx) }));
    };

    const runReverseAnalysis = async () => {
        if (reverseAnalysis.files.length === 0) return showAlert('Envie pelo menos um PDF ou imagem de prova antiga.');
        const banca = reverseAnalysis.bancaName.trim() || 'Banca Não Identificada';
        setReverseAnalysis(p => ({ ...p, isAnalyzing: true, result: '' }));

        try {
            const prompt = `Você é um analista de bancas de concursos médicos de ALTÍSSIMO NÍVEL. Sua missão é realizar uma ANÁLISE REVERSA COMPLETA e DETALHADA de provas antigas da banca "${banca}".

Analise TODOS os documentos/imagens de provas anexados e produza um mapeamento EXTREMAMENTE DETALHADO, didático e estratégico.

INSTRUÇÃO ABSOLUTA E OBRIGATÓRIA: É EXTREMAMENTE PROIBIDO resumir, agrupar ou pular questões. Você deve agir como um processador exaustivo. Para CADA QUESTÃO INDIVIDUAL presente no documento, você DEVE criar um item no array "questoesAnalisadas".

IMPORTANTE: Você DEVE retornar APENAS um objeto JSON válido.
{
  "dnaBanca": {
    "dificuldadeGeral": 8,
    "perfilEstilo": "...",
    "caracteristicasMarcantes": ["..."]
  },
  "morfologiaAlternativaCorreta": {
    "comprimentoMedio": "...",
    "linguagemUtilizada": "...",
    "termosAbsolutosVsRelativos": "...",
    "distribuicaoGabarito": "...",
    "detalhesAdicionais": "..."
  },
  "padroesLinguisticos": {
    "estiloEnunciado": "...",
    "palavrasChaveRecorrentes": ["..."],
    "usoDuplaNegacao": "...",
    "conectivosLogicos": "..."
  },
  "logicaConstrucaoQuestoes": {
    "focoPrincipal": "...",
    "construcaoDistratores": ["..."],
    "armadilhasComuns": "...",
    "regraVsExcecao": "..."
  },
  "temasMaisCobrados": [
    { "tema": "...", "profundidade": "..." }
  ],
  "estrategiasResolucao": ["..."],
  "questoesAnalisadas": [
    {
      "identificacao": "Questão 1",
      "enunciadoResumido": "...",
      "gabarito": "...",
      "licaoPadraoBanca": "..."
    }
  ]
}`;

            const parts = reverseAnalysis.files.map(f => ({
                inlineData: { data: f.data.split(',')[1], mimeType: f.mimeType }
            }));
            parts.push({ text: prompt });

            const res = await callIA([{ role: 'user', parts }]);

            if (res) {
                const match = res.match(/\{[\s\S]*\}/);
                const jsonStr = match ? match[0] : res;
                const newEntry = {
                    id: Date.now(),
                    bancaName: banca,
                    date: new Date().toLocaleDateString('pt-PT'),
                    result: jsonStr,
                    fileCount: reverseAnalysis.files.length
                };
                
                const updatedHistory = [newEntry, ...(reverseAnalysis.history || [])];
                setReverseAnalysis(p => ({
                    ...p,
                    isAnalyzing: false,
                    result: jsonStr,
                    history: updatedHistory,
                    files: []
                }));
                setDb(prev => ({ ...prev, reverseAnalysisHistory: updatedHistory }));
            }
        } catch (err) {
            showAlert('Erro na análise: ' + err.message);
            setReverseAnalysis(p => ({ ...p, isAnalyzing: false }));
        }
    };

    const activeResult = reverseAnalysis.result;
    let parsedResult = null;
    if (activeResult) {
        try {
            const match = activeResult.match(/\{[\s\S]*\}/);
            parsedResult = JSON.parse(match ? match[0] : activeResult);
        } catch (e) {}
    }

    return (
        <div className="p-10 max-w-7xl mx-auto animate-in fade-in duration-700 pb-32">
            <header className="mb-12">
                <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Análise <span className="text-white/20">Reversa</span></h2>
                <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Decodifique o DNA das bancas com IA de elite.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bento-card p-8 rounded-[3rem] space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Banca Examinadora</label>
                            <input 
                                type="text" value={reverseAnalysis.bancaName} 
                                onChange={e => setReverseAnalysis(p => ({ ...p, bancaName: e.target.value }))}
                                placeholder="Ex: USP, ENARE, UNICAMP"
                                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Arquivos Carregados</label>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 planner-scroll">
                                {reverseAnalysis.files.map((f, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">{f.name}</span>
                                        <button onClick={() => removeReverseFile(idx)} className="text-zinc-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                                    </div>
                                ))}
                                {reverseAnalysis.files.length === 0 && <p className="text-center text-zinc-600 text-[10px] font-bold py-4 italic">Nenhum arquivo anexado</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bento-card p-12 rounded-[3.5rem] h-full flex flex-col items-center justify-center text-center relative overflow-hidden border-2 border-dashed border-white/5 hover:border-emerald-500/20 transition-all group">
                        <input type="file" accept=".pdf,image/*" multiple onChange={handleReverseFiles} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-file-circle-plus"></i>
                        </div>
                        <h3 className="text-2xl font-black mb-2">Enviar Provas Antigas</h3>
                        <p className="text-zinc-500 font-bold text-sm max-w-sm mb-8 uppercase tracking-tighter leading-tight">Arraste múltiplos arquivos PDF ou imagens para um cruzamento de altíssima precisão.</p>
                        
                        <button 
                            onClick={runReverseAnalysis} disabled={reverseAnalysis.isAnalyzing || reverseAnalysis.files.length === 0}
                            className="relative z-20 px-12 py-5 premium-btn rounded-2xl font-black shadow-2xl flex items-center gap-4 active:scale-95 transition-all disabled:opacity-20"
                        >
                            {reverseAnalysis.isAnalyzing ? <><i className="fa-solid fa-dna fa-spin"></i> ANALISANDO...</> : <><i className="fa-solid fa-magnifying-glass-chart"></i> INICIAR ENGENHARIA REVERSA</>}
                        </button>
                    </div>
                </div>
            </div>

            {parsedResult && (
                <div className="animate-in slide-in-from-bottom-10 duration-700 space-y-10">
                    <div className="bento-card p-10 rounded-[4rem] border-emerald-500/20 bg-emerald-500/[0.02]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/5 pb-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-2xl text-white shadow-2xl shadow-emerald-500/20">
                                    <i className="fa-solid fa-microscope"></i>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Mapeamento Genético</span>
                                    <h3 className="text-3xl font-black mt-1 uppercase italic tracking-tighter">{reverseAnalysis.bancaName}</h3>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => {
                                    const blob = new Blob([activeResult], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `Analise_Reversa_${reverseAnalysis.bancaName}.json`;
                                    a.click();
                                }} className="glass-obsidian px-6 py-3 rounded-xl text-xs font-black hover:bg-white/10 transition-all uppercase tracking-widest"><i className="fa-solid fa-download mr-2"></i> Baixar Dados</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-4">Dificuldade Geral</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-emerald-500">{parsedResult.dnaBanca?.dificuldadeGeral}</span>
                                    <span className="text-zinc-600 font-bold">/10</span>
                                </div>
                            </div>
                            <div className="lg:col-span-3 bg-zinc-950/50 p-6 rounded-3xl border border-white/5">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Perfil do Estilo</span>
                                <p className="text-sm font-bold text-zinc-300 leading-relaxed">{parsedResult.dnaBanca?.perfilEstilo}</p>
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-lg font-black uppercase tracking-tighter neon-emerald flex items-center gap-3"><i className="fa-solid fa-fingerprint"></i> Lógica de Construção</h4>
                                <div className="space-y-4">
                                    {parsedResult.logicaConstrucaoQuestoes?.construcaoDistratores?.map((d, i) => (
                                        <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <i className="fa-solid fa-circle-nodes text-emerald-500 mt-1"></i>
                                            <span className="text-xs font-bold text-zinc-400">{d}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-lg font-black uppercase tracking-tighter text-amber-500 flex items-center gap-3"><i className="fa-solid fa-triangle-exclamation"></i> Armadilhas Comuns</h4>
                                <div className="bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/10">
                                    <p className="text-sm font-bold text-amber-200/70 leading-relaxed">{parsedResult.logicaConstrucaoQuestoes?.armadilhasComuns}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bento-card p-10 rounded-[3.5rem]">
                            <h4 className="text-xl font-black mb-8 flex items-center gap-4"><i className="fa-solid fa-chart-line text-emerald-500"></i> Temas Mais Cobrados</h4>
                            <div className="space-y-3">
                                {parsedResult.temasMaisCobrados?.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
                                        <span className="font-black text-sm uppercase tracking-tighter text-zinc-300">{t.tema}</span>
                                        <span className="text-[10px] font-black px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full uppercase tracking-widest">{t.profundidade}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bento-card p-10 rounded-[3.5rem]">
                            <h4 className="text-xl font-black mb-8 flex items-center gap-4"><i className="fa-solid fa-lightbulb text-amber-500"></i> Estratégias de Elite</h4>
                            <div className="space-y-4">
                                {parsedResult.estrategiasResolucao?.map((s, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                                        <span className="text-xs font-bold text-zinc-400">{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bento-card p-10 rounded-[4rem]">
                        <h4 className="text-2xl font-black mb-10 flex items-center gap-4 border-b border-white/5 pb-6"><i className="fa-solid fa-list-check text-emerald-500"></i> Questões Analisadas Individualmente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {parsedResult.questoesAnalisadas?.map((q, i) => (
                                <div key={i} className="bg-zinc-950/50 p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/20 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <h5 className="font-black text-emerald-500 uppercase tracking-tighter">{q.identificacao}</h5>
                                        <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded text-zinc-500 uppercase">Gabarito: {q.gabarito}</span>
                                    </div>
                                    <p className="text-xs font-bold text-zinc-400 mb-6 italic leading-relaxed">"{q.enunciadoResumido}"</p>
                                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Lição de Elite</span>
                                        <p className="text-xs font-bold text-emerald-200/70">{q.licaoPadraoBanca}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {reverseAnalysis.history.length > 0 && (
                <div className="mt-20">
                    <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><i className="fa-solid fa-clock-rotate-left text-zinc-600"></i> Histórico de Análises</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {reverseAnalysis.history.map(entry => (
                            <div key={entry.id} onClick={() => setReverseAnalysis(p => ({ ...p, result: entry.result, bancaName: entry.bancaName }))} className="bento-card p-6 rounded-3xl cursor-pointer group hover:border-emerald-500/30 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 text-lg group-hover:scale-110 transition-transform"><i className="fa-solid fa-dna"></i></div>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir histórico?')) setDb(prev => ({ ...prev, reverseAnalysisHistory: prev.reverseAnalysisHistory.filter(x => x.id !== entry.id) })); setReverseAnalysis(p => ({ ...p, history: p.history.filter(x => x.id !== entry.id) })); }} className="text-zinc-600 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
                                </div>
                                <h4 className="font-black text-white uppercase tracking-tighter truncate">{entry.bancaName}</h4>
                                <p className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-widest">{entry.date} • {entry.fileCount} Arquivos</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReverseAnalysisTab;
