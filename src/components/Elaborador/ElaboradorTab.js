import React, { useState, useEffect } from 'react';
import { compressImage } from '../../utils/image';

/**
 * Componente para o Elaborador de Questões e Simulados de Elite.
 */
const ElaboradorTab = ({ db, setDb, showAlert, setActiveTab, callIA, aiConfig }) => {
    const [view, setView] = useState('setup'); // setup, exam, results
    const [config, setConfig] = useState({ subject: '', num: 10, difficulty: 'mediana', modality: 'multi' });
    const [examState, setExamState] = useState({ 
        questions: [], 
        answers: {}, 
        startTime: null, 
        endTime: null, 
        currentIdx: 0, 
        isGenerating: false, 
        isCorrecting: false, 
        results: null,
        materialText: '',
        explanation: null 
    });
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (view === 'exam' && !examState.endTime) {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [view, examState.endTime]);

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const extractTextFromPDF = async (data) => {
        if (!window.pdfjsLib) {
            throw new Error("Biblioteca PDF.js não carregada.");
        }
        try {
            const pdf = await window.pdfjsLib.getDocument({ data }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                fullText += strings.join(" ") + "\n";
            }
            return fullText;
        } catch (e) {
            console.error("Erro PDF.js:", e);
            throw new Error("Falha ao extrair texto do PDF.");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const name = file.name.toLowerCase();
        
        setExamState(p => ({ ...p, isGenerating: true }));

        if (name.endsWith('.pdf')) {
            reader.onload = async (ev) => {
                try {
                    const typedarray = new Uint8Array(ev.target.result);
                    const text = await extractTextFromPDF(typedarray);
                    setExamState(p => ({ ...p, materialText: text, isGenerating: false }));
                    showAlert("✅ PDF processado! A IA usará este material para gerar o simulado.");
                } catch (err) {
                    setExamState(p => ({ ...p, isGenerating: false }));
                    showAlert("❌ Erro ao ler PDF: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (name.match(/\.(jpg|jpeg|png|webp)$/)) {
            reader.onload = async (ev) => {
                try {
                    const b64 = await compressImage(ev.target.result);
                    // OCR via Gemini
                    const res = await callIA([
                        { role: 'user', parts: [{ text: "Transcreva todo o texto médico desta imagem para ser usado como base de estudo. Retorne apenas o texto transcrito." }, { inlineData: { mimeType: 'image/jpeg', data: b64.split(',')[1] } }] }
                    ]);
                    setExamState(p => ({ ...p, materialText: res, isGenerating: false }));
                    showAlert("✅ Imagem analisada com sucesso!");
                } catch (err) {
                    setExamState(p => ({ ...p, isGenerating: false }));
                    showAlert("❌ Erro no OCR: " + err.message);
                }
            };
            reader.readAsDataURL(file);
        } else if (name.endsWith('.txt')) {
            reader.onload = (ev) => {
                setExamState(p => ({ ...p, materialText: ev.target.result, isGenerating: false }));
                showAlert("✅ Arquivo de texto carregado!");
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const generateExam = async () => {
        if (!config.subject.trim() && !examState.materialText) return showAlert("Defina o assunto ou forneça um material!");
        setExamState(p => ({ ...p, isGenerating: true }));
        try {
            const modalityPrompt = {
                multi: "Múltipla Escolha (4-5 alternativas)",
                ce: "Certo ou Errado (estilo CESPE)",
                open: "Discursivas Abertas (exige resposta escrita)"
            }[config.modality];

            const systemPrompt = `Você é um elaborador de provas de residência médica de ELITE. Gere um simulado com EXATAMENTE ${config.num} questões.
            Modalidade: ${modalityPrompt}.
            Dificuldade: ${config.difficulty === 'impossivel' ? 'BRUTAL (foco em casos raros, rodapé de livro, diretrizes ultra-específicas e exceções)' : config.difficulty}.`;

            const userPrompt = examState.materialText 
                ? `BASEIE-SE EXCLUSIVAMENTE NO MATERIAL ABAIXO PARA CRIAR AS QUESTÕES:\n\n${examState.materialText}\n\nTEMA: ${config.subject}`
                : `TEMA DO SIMULADO: ${config.subject}`;

            const finalPrompt = `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANTE: Retorne APENAS um array JSON válido:\n[{ "id": 1, "text": "Enunciado...", "options": ["A) ...", "B) ..."], "correct": 0, "standardAnswer": "...", "explanation": "..." }]`;

            const res = await callIA([{ role: 'user', parts: [{ text: finalPrompt }] }]);
            const match = res.match(/\[[\s\S]*\]/);
            if (match) {
                const quests = JSON.parse(match[0]);
                setExamState(p => ({ 
                    ...p, 
                    questions: quests, 
                    isGenerating: false, 
                    currentIdx: 0, 
                    answers: {}, 
                    startTime: Date.now(),
                    endTime: null,
                    results: null
                }));
                setView('exam');
                setTimer(0);
            }
        } catch (e) {
            showAlert("Erro ao materializar simulado: " + e.message);
            setExamState(p => ({ ...p, isGenerating: false }));
        }
    };

    const finalizeExam = async () => {
        if (Object.keys(examState.answers).length < examState.questions.length) {
            if (!confirm("Você não respondeu todas as questões. Deseja finalizar mesmo assim?")) return;
        }

        setExamState(p => ({ ...p, endTime: Date.now(), isCorrecting: true }));
        
        try {
            if (config.modality === 'open') {
                const prompt = `Você é um preceptor médico rigoroso. Corrija estas ${examState.questions.length} questões discursivas.
                Gabaritos: ${JSON.stringify(examState.questions.map(q => ({ id: q.id, expected: q.standardAnswer })))}
                Respostas Aluno: ${JSON.stringify(examState.answers)}
                
                Avalie semanticamente (se o conceito médico principal está correto).
                Retorne APENAS JSON: { "score": 0-100, "details": [{ "id": 1, "correct": true/false, "feedback": "..." }] }`;

                const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
                const match = res.match(/\{[\s\S]*\}/);
                if (match) {
                    const result = JSON.parse(match[0]);
                    setExamState(p => ({ ...p, results: result, isCorrecting: false }));
                }
            } else {
                let correctCount = 0;
                const details = examState.questions.map(q => {
                    const isCorrect = parseInt(examState.answers[q.id]) === q.correct;
                    if (isCorrect) correctCount++;
                    return { id: q.id, correct: isCorrect, feedback: q.explanation };
                });
                const score = Math.round((correctCount / examState.questions.length) * 100);
                setExamState(p => ({ ...p, results: { score, details }, isCorrecting: false }));
            }
            setView('results');
        } catch (e) {
            showAlert("Erro na correção: " + e.message);
            setExamState(p => ({ ...p, isCorrecting: false }));
        }
    };

    const handleExplainQuestion = async (qId) => {
        const q = examState.questions.find(x => x.id === qId);
        const ans = examState.answers[qId];
        const detail = examState.results.details.find(d => d.id === qId);
        
        setExamState(p => ({ ...p, explanation: { id: qId, text: 'Carregando explicação profunda...' } }));
        
        try {
            const prompt = `Você é um Professor de Medicina de Elite. Explique detalhadamente esta questão.
            Questão: ${q.text}
            Alternativas: ${JSON.stringify(q.options)}
            Resposta do Aluno: ${config.modality === 'open' ? ans : q.options[ans]}
            Gabarito Correto: ${config.modality === 'open' ? q.standardAnswer : q.options[q.correct]}
            
            FOCO: Explique o raciocínio clínico, mnemônicas para memorização e por que as outras opções estão incorretas.
            Mantenha um tom ${aiConfig?.persona || 'arrogante'} (como configurado no sistema).`;

            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            setExamState(p => ({ ...p, explanation: { id: qId, text: res } }));
        } catch (e) {
            setExamState(p => ({ ...p, explanation: { id: qId, text: 'Erro ao obter explicação: ' + e.message } }));
        }
    };

    const generateFlashcardsFromErrors = () => {
        const r = examState.results;
        const errors = r.details.filter(d => !d.correct);
        if (errors.length === 0) return showAlert("Parabéns! Sem erros para gerar cards.");
        
        const newCards = errors.map(d => {
            const q = examState.questions.find(x => x.id === d.id);
            return {
                id: Date.now() + Math.random(),
                deckName: `Simulados: ${config.subject || 'Geral'}`,
                front: `[SIMULADO] Sobre ${config.subject || 'Medicina'}:\n\n${q.text}`,
                back: `<b>RESPOSTA CORRETA:</b> ${config.modality === 'open' ? q.standardAnswer : q.options[q.correct]}<br><br><b>EXPLICAÇÃO:</b> ${d.feedback}`,
                date: new Date().toLocaleDateString('pt-PT')
            };
        });
        
        setDb(p => ({ ...p, flashcards: [...newCards, ...(p.flashcards || [])] }));
        showAlert(`✅ ${newCards.length} Flashcards gerados com sucesso! Sincronize com o Anki para estudar.`);
    };

    if (view === 'setup') {
        return (
            <div className="p-6 md:p-12 max-w-6xl mx-auto animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Painel de Controle Bento */}
                    <div className="lg:col-span-8 space-y-4 md:space-y-8">
                        <div className="bg-white dark:bg-zinc-900 p-6 md:p-12 rounded-3xl md:rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-amber-500/10 transition-all"></div>
                            <h2 className="text-2xl md:text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-6 md:mb-8 flex items-center gap-3">
                                <i className="fa-solid fa-wand-magic-sparkles text-amber-500 animate-pulse"></i> Elaborador <span className="text-xs bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest ml-2">PRO</span>
                            </h2>
                            
                            <div className="space-y-6 md:space-y-8">
                                <div>
                                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 md:mb-4">Assunto ou Link de Material</label>
                                    <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                                        <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} placeholder="Ex: Emergências Hipertensivas..." className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-5 md:p-6 font-black text-lg md:text-xl outline-none focus:ring-4 focus:ring-amber-500/20 transition-all shadow-inner" />
                                        <div className="relative shrink-0 w-full md:w-auto">
                                            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <button className="w-full h-full py-4 px-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-amber-600 rounded-2xl md:rounded-3xl font-black flex items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-800">
                                                <i className="fa-solid fa-file-import text-xl"></i>
                                                <span>Alimentar</span>
                                            </button>
                                        </div>
                                    </div>
                                    {examState.materialText && (
                                        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <i className="fa-solid fa-check-circle text-emerald-500"></i>
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Material Processado ({examState.materialText.length} caracteres)</span>
                                            </div>
                                            <button onClick={() => setExamState(p => ({ ...p, materialText: '' }))} className="text-emerald-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-800">
                                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Quantidade de Questões</label>
                                        <input type="range" min="5" max="50" step="5" value={config.num} onChange={e => setConfig({...config, num: parseInt(e.target.value)})} className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                        <div className="flex justify-between mt-4">
                                            <span className="text-2xl font-black text-amber-600">{config.num}</span>
                                            <span className="text-xs font-black text-zinc-400 uppercase">Itens</span>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-800">
                                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Dificuldade</label>
                                        <div className="flex gap-2">
                                            {['fácil', 'mediana', 'difícil', 'impossivel'].map(d => (
                                                <button key={d} onClick={() => setConfig({...config, difficulty: d})} className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${config.difficulty === d ? 'bg-amber-500 text-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50'}`}>
                                                    {d === 'impossivel' ? '🔥 Brutal' : d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    {[
                                        { id: 'multi', label: 'Múltipla', icon: 'fa-list-check' },
                                        { id: 'ce', label: 'Certo/Errado', icon: 'fa-check-double' },
                                        { id: 'open', label: 'Discursiva', icon: 'fa-pen-to-square' }
                                    ].map(m => (
                                        <div key={m.id} onClick={() => setConfig({...config, modality: m.id})} className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex flex-row md:flex-col items-center justify-center md:justify-start gap-4 md:gap-3 ${config.modality === m.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-xl' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:scale-[1.02]'}`}>
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl ${config.modality === m.id ? 'bg-amber-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><i className={`fa-solid ${m.icon}`}></i></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{m.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <button disabled={examState.isGenerating} onClick={generateExam} className="w-full py-6 md:py-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl md:rounded-3xl font-black text-xl md:text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-4 md:mt-8 disabled:opacity-50">
                                    {examState.isGenerating ? <i className="fa-solid fa-dna fa-spin"></i> : <i className="fa-solid fa-brain"></i>}
                                    {examState.isGenerating ? 'Processando...' : 'Gerar Simulado'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar de Analytics e Histórico */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-xl">
                            <h3 className="text-xl font-black mb-4">Seu Progresso</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                                    <span className="block text-[8px] font-black uppercase tracking-widest opacity-60">Total Simulados</span>
                                    <span className="text-3xl font-black">24</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                                    <span className="block text-[8px] font-black uppercase tracking-widest opacity-60">Taxa de Acerto</span>
                                    <span className="text-3xl font-black text-emerald-300">82%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg">
                            <h3 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left"></i> Histórico Recente</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center font-black">90</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-black text-xs truncate">Nefrologia</p>
                                        <p className="text-[8px] font-bold text-zinc-400">Ontem • 10 questões</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl flex items-center justify-center font-black">45</div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-black text-xs truncate">Infectologia (Impossível)</p>
                                        <p className="text-[8px] font-bold text-zinc-400">Há 2 dias • 20 questões</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'exam') {
        const q = examState.questions[examState.currentIdx];
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-10 pb-32 animate-in slide-in-from-right-8 duration-500">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Painel Central da Questão */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-zinc-900 p-6 md:p-16 rounded-3xl md:rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 min-h-[500px] flex flex-col relative">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] md:text-xs font-black text-zinc-500 rounded-full uppercase tracking-widest">Questão {examState.currentIdx + 1} / {examState.questions.length}</span>
                                    {config.modality === 'open' && <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-[9px] md:text-xs font-black text-indigo-500 rounded-full uppercase tracking-widest">Discursiva</span>}
                                </div>
                                <div className="text-lg md:text-xl font-black text-zinc-800 dark:text-zinc-100 font-mono bg-zinc-100 dark:bg-zinc-800 px-4 md:px-6 py-2 rounded-xl md:rounded-2xl flex items-center gap-2 w-fit">
                                    <i className="fa-solid fa-clock text-amber-500 animate-pulse"></i> {formatTime(timer)}
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-lg md:text-2xl font-bold leading-relaxed text-zinc-800 dark:text-zinc-100 mb-10 text-justify-custom whitespace-pre-wrap">{q.text}</p>
                                
                                <div className="space-y-3 md:space-y-4">
                                    {config.modality === 'open' ? (
                                        <textarea value={examState.answers[q.id] || ''} onChange={e => setExamState(p => ({ ...p, answers: { ...p.answers, [q.id]: e.target.value } }))} placeholder="Sua resposta clínica fundamentada..." className="w-full h-48 md:h-64 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-6 md:p-8 text-base md:text-lg font-bold outline-none focus:border-amber-500 transition-all resize-none shadow-inner" />
                                    ) : (
                                        q.options.map((opt, idx) => (
                                            <button key={idx} onClick={() => setExamState(p => ({ ...p, answers: { ...p.answers, [q.id]: idx } }))} className={`w-full p-5 md:p-6 rounded-2xl md:rounded-[28px] border-2 text-left font-bold transition-all flex items-center gap-3 md:gap-4 group ${examState.answers[q.id] === idx ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-lg' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-300'}`}>
                                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-colors ${examState.answers[q.id] === idx ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-400'}`}>{String.fromCharCode(65 + idx)}</div>
                                                <span className={`text-sm md:text-base ${examState.answers[q.id] === idx ? 'text-amber-900 dark:text-amber-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{opt}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                                <button disabled={examState.currentIdx === 0} onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx - 1 }))} className="w-full md:w-auto px-8 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl md:rounded-[24px] font-black hover:bg-zinc-200 transition-all disabled:opacity-20 flex items-center justify-center gap-2">Anterior</button>
                                
                                <div className="flex gap-4 w-full md:w-auto">
                                    {examState.currentIdx === examState.questions.length - 1 ? (
                                        <button onClick={finalizeExam} className="flex-1 md:flex-none px-8 py-4 bg-amber-600 text-white rounded-xl md:rounded-[24px] font-black shadow-xl shadow-amber-900/20 hover:bg-amber-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                                            Finalizar Simulado
                                        </button>
                                    ) : (
                                        <button onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx + 1 }))} className="flex-1 md:flex-none px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl md:rounded-[24px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                                            Próxima <i className="fa-solid fa-chevron-right"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar de Progresso da Prova */}
                    <div className="lg:col-span-4 space-y-6 hidden lg:block">
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl sticky top-10">
                            <h3 className="font-black text-sm uppercase tracking-widest text-zinc-400 mb-8 flex items-center justify-between">
                                Mapa da Prova
                                <span className="text-amber-500">{Math.round((Object.keys(examState.answers).length / examState.questions.length) * 100)}%</span>
                            </h3>
                            <div className="grid grid-cols-5 gap-3">
                                {examState.questions.map((_, i) => (
                                    <button key={i} onClick={() => setExamState(p => ({ ...p, currentIdx: i }))} className={`w-full aspect-square rounded-xl font-black text-xs transition-all ${examState.currentIdx === i ? 'ring-4 ring-amber-500/20 bg-amber-500 text-white shadow-lg' : examState.answers[_.id] !== undefined ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200'}`}>
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                                <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs">
                                    <i className="fa-solid fa-circle-info text-amber-500"></i>
                                    <span>Modo Concurso: Feedback disponível apenas no encerramento.</span>
                                </div>
                                <button onClick={() => { if(confirm("Deseja realmente cancelar este simulado? Todo o progresso será perdido.")) setView('setup'); }} className="w-full py-4 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-all">Desistir do Simulado</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results') {
        const r = examState.results;
        return (
            <div className="p-6 md:p-12 max-w-5xl mx-auto animate-in zoom-in-95 duration-500 pb-32">
                <div className="text-center mb-16">
                    <div className={`inline-flex items-center justify-center w-40 h-40 rounded-full border-8 shadow-2xl mb-8 ${r.score >= 80 ? 'border-emerald-500 text-emerald-600' : r.score >= 50 ? 'border-amber-500 text-amber-600' : 'border-rose-500 text-rose-600'}`}>
                        <span className="text-5xl font-black">{r.score}%</span>
                    </div>
                    <h2 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-4">Resultado Final</h2>
                    <p className="text-zinc-500 font-bold max-w-lg mx-auto">Você completou o simulado de <b>{config.subject}</b> em <b>{formatTime(timer)}</b>.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 mb-16">
                    {examState.questions.map((q, idx) => {
                        const detail = r.details.find(d => d.id === q.id);
                        const isExplaining = examState.explanation?.id === q.id;
                        return (
                            <div key={q.id} className={`bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2rem] border-2 shadow-xl ${detail.correct ? 'border-emerald-100 dark:border-emerald-900/30 shadow-emerald-500/5' : 'border-rose-100 dark:border-rose-900/30 shadow-rose-500/5'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${detail.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {detail.correct ? 'Acerto' : 'Erro'}
                                        </span>
                                        <span className="text-zinc-400 font-black text-xs uppercase">Questão {idx + 1}</span>
                                    </div>
                                    <button onClick={() => handleExplainQuestion(q.id)} className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1.5 transition-all">
                                        <i className="fa-solid fa-brain"></i> Professor IA
                                    </button>
                                </div>
                                
                                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-6 leading-relaxed">{q.text}</p>
                                
                                <div className="space-y-4">
                                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Sua Resposta:</p>
                                        <p className={`font-bold ${detail.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {config.modality === 'open' ? examState.answers[q.id] : (q.options ? q.options[examState.answers[q.id]] : 'Sem resposta')}
                                        </p>
                                    </div>

                                    {!detail.correct && (
                                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Gabarito:</p>
                                            <p className="font-bold text-emerald-800 dark:text-emerald-200">{config.modality === 'open' ? q.standardAnswer : q.options[q.correct]}</p>
                                        </div>
                                    )}

                                    {isExplaining && (
                                        <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/50 animate-in slide-in-from-top-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <i className="fa-solid fa-chalkboard-user text-amber-600"></i>
                                                <h4 className="font-black text-sm uppercase tracking-widest text-amber-700 dark:text-amber-500">Análise Profunda</h4>
                                            </div>
                                            <div className="text-sm font-medium leading-relaxed text-justify-custom text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                                {examState.explanation.text}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!isExplaining && (
                                        <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Comentário Rápido:</p>
                                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">{detail.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col md:flex-row justify-center gap-4">
                    <button onClick={() => setView('setup')} className="px-12 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[24px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all">Novo Simulado</button>
                    <button onClick={generateFlashcardsFromErrors} className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i className="fa-solid fa-clone"></i> Flashcards dos Erros
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default ElaboradorTab;
