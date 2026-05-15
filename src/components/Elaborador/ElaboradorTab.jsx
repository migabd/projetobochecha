import React, { useState, useEffect } from 'react';
import { compressImage } from '../../utils/image';

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
        if (!window.pdfjsLib) throw new Error("Biblioteca PDF.js não carregada.");
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
                    const text = await extractTextFromPDF(new Uint8Array(ev.target.result));
                    setExamState(p => ({ ...p, materialText: text, isGenerating: false }));
                    showAlert("✅ PDF processado!");
                } catch (err) {
                    setExamState(p => ({ ...p, isGenerating: false }));
                    showAlert("❌ Erro: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (name.match(/\.(jpg|jpeg|png|webp)$/)) {
            reader.onload = async (ev) => {
                try {
                    const b64 = await compressImage(ev.target.result);
                    const res = await callIA([
                        { role: 'user', parts: [{ text: "Transcreva todo o texto médico desta imagem." }, { inlineData: { mimeType: 'image/jpeg', data: b64.split(',')[1] } }] }
                    ]);
                    setExamState(p => ({ ...p, materialText: res, isGenerating: false }));
                    showAlert("✅ Imagem analisada!");
                } catch (err) {
                    setExamState(p => ({ ...p, isGenerating: false }));
                    showAlert("❌ Erro: " + err.message);
                }
            };
            reader.readAsDataURL(file);
        } else if (name.endsWith('.txt')) {
            reader.onload = (ev) => {
                setExamState(p => ({ ...p, materialText: ev.target.result, isGenerating: false }));
                showAlert("✅ Texto carregado!");
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const generateExam = async () => {
        if (!config.subject.trim() && !examState.materialText) return showAlert("Defina o assunto ou material!");
        setExamState(p => ({ ...p, isGenerating: true }));
        try {
            const modalityPrompt = { multi: "Múltipla Escolha", ce: "Certo ou Errado", open: "Discursivas" }[config.modality];
            const finalPrompt = `Gere ${config.num} questões médicos. Modalidade: ${modalityPrompt}. Dificuldade: ${config.difficulty}. Tema: ${config.subject}. Material: ${examState.materialText}. Retorne APENAS um array JSON: [{ "id": 1, "text": "...", "options": ["A...", "B..."], "correct": 0, "standardAnswer": "...", "explanation": "..." }]`;
            const res = await callIA([{ role: 'user', parts: [{ text: finalPrompt }] }]);
            const match = res.match(/\[[\s\S]*\]/);
            if (match) {
                const quests = JSON.parse(match[0]);
                setExamState(p => ({ ...p, questions: quests, isGenerating: false, currentIdx: 0, answers: {}, startTime: Date.now(), endTime: null, results: null }));
                setView('exam');
                setTimer(0);
            }
        } catch (e) {
            showAlert("Erro: " + e.message);
            setExamState(p => ({ ...p, isGenerating: false }));
        }
    };

    const finalizeExam = async () => {
        if (Object.keys(examState.answers).length < examState.questions.length) {
            if (!confirm("Responder todas?")) return;
        }
        setExamState(p => ({ ...p, endTime: Date.now(), isCorrecting: true }));
        try {
            if (config.modality === 'open') {
                const prompt = `Corrija as discursivas. Gabaritos: ${JSON.stringify(examState.questions.map(q => ({ id: q.id, expected: q.standardAnswer })))} Respostas: ${JSON.stringify(examState.answers)}. Retorne JSON: { "score": 0-100, "details": [{ "id": 1, "correct": true, "feedback": "..." }] }`;
                const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
                const match = res.match(/\{[\s\S]*\}/);
                if (match) setExamState(p => ({ ...p, results: JSON.parse(match[0]), isCorrecting: false }));
            } else {
                let correctCount = 0;
                const details = examState.questions.map(q => {
                    const isCorrect = parseInt(examState.answers[q.id]) === q.correct;
                    if (isCorrect) correctCount++;
                    return { id: q.id, correct: isCorrect, feedback: q.explanation };
                });
                setExamState(p => ({ ...p, results: { score: Math.round((correctCount/examState.questions.length)*100), details }, isCorrecting: false }));
            }
            setView('results');
        } catch (e) {
            showAlert("Erro: " + e.message);
            setExamState(p => ({ ...p, isCorrecting: false }));
        }
    };

    const handleExplainQuestion = async (qId) => {
        const q = examState.questions.find(x => x.id === qId);
        setExamState(p => ({ ...p, explanation: { id: qId, text: 'Carregando...' } }));
        try {
            const prompt = `Explique profundamente a questão: ${q.text}. Gabarito: ${q.correct}. Alternativas: ${JSON.stringify(q.options)}`;
            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            setExamState(p => ({ ...p, explanation: { id: qId, text: res } }));
        } catch (e) {
            setExamState(p => ({ ...p, explanation: { id: qId, text: 'Erro.' } }));
        }
    };

    if (view === 'setup') {
        return (
            <div className="p-6 md:p-12 max-w-6xl mx-auto animate-in fade-in">
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-12 rounded-3xl border shadow-2xl">
                    <h2 className="text-2xl md:text-4xl font-black mb-8 flex items-center gap-3">
                        <i className="fa-solid fa-wand-magic-sparkles text-amber-500"></i> Elaborador PRO
                    </h2>
                    <div className="space-y-8">
                        <div>
                            <label className="block text-xs font-black text-zinc-400 uppercase mb-3">Assunto ou Material</label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} placeholder="Ex: Hipertensão..." className="flex-1 bg-zinc-50 dark:bg-zinc-950 border rounded-2xl p-5 font-black outline-none focus:ring-4 focus:ring-amber-500/20" />
                                <div className="relative h-16 w-full md:w-48">
                                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <button className="w-full h-full bg-zinc-100 dark:bg-zinc-800 text-amber-600 rounded-2xl font-black">Alimentar</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border">
                                <label className="block text-xs font-black text-zinc-400 uppercase mb-4">Questões: {config.num}</label>
                                <input type="range" min="5" max="50" step="5" value={config.num} onChange={e => setConfig({...config, num: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                            </div>
                            <div className="flex gap-2">
                                {['fácil', 'mediana', 'difícil', 'impossivel'].map(d => (
                                    <button key={d} onClick={() => setConfig({...config, difficulty: d})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${config.difficulty === d ? 'bg-amber-500 text-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-zinc-400 border'}`}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button disabled={examState.isGenerating} onClick={generateExam} className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">
                            {examState.isGenerating ? 'Processando...' : 'Gerar Simulado'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'exam') {
        const q = examState.questions[examState.currentIdx];
        return (
            <div className="min-h-screen p-4 md:p-10 animate-in slide-in-from-right">
                <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 p-6 md:p-12 rounded-3xl shadow-2xl border">
                    <div className="flex justify-between items-center mb-8">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Q{examState.currentIdx + 1} / {examState.questions.length}</span>
                        <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl font-black text-amber-500">{formatTime(timer)}</div>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-10 leading-relaxed">{q.text}</p>
                    <div className="space-y-4">
                        {config.modality === 'open' ? (
                            <textarea value={examState.answers[q.id] || ''} onChange={e => setExamState(p => ({ ...p, answers: { ...p.answers, [q.id]: e.target.value } }))} className="w-full h-48 bg-zinc-50 dark:bg-zinc-950 border rounded-2xl p-6 font-bold outline-none focus:border-amber-500 shadow-inner" />
                        ) : (
                            q.options.map((opt, idx) => (
                                <button key={idx} onClick={() => setExamState(p => ({ ...p, answers: { ...p.answers, [q.id]: idx } }))} className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex items-center gap-4 ${examState.answers[q.id] === idx ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${examState.answers[q.id] === idx ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-400'}`}>{String.fromCharCode(65 + idx)}</div>
                                    <span className="text-sm md:text-base">{opt}</span>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="mt-10 flex justify-between gap-4">
                        <button disabled={examState.currentIdx === 0} onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx - 1 }))} className="px-8 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black disabled:opacity-20">Anterior</button>
                        {examState.currentIdx === examState.questions.length - 1 ? (
                            <button onClick={finalizeExam} className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-black">Finalizar</button>
                        ) : (
                            <button onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx + 1 }))} className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black">Próxima</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results') {
        const r = examState.results;
        return (
            <div className="p-6 md:p-12 max-w-4xl mx-auto animate-in zoom-in pb-32">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-emerald-500 text-emerald-600 mb-6">
                        <span className="text-4xl font-black">{r.score}%</span>
                    </div>
                    <h2 className="text-3xl font-black">Resultado Final</h2>
                </div>
                <div className="space-y-6">
                    {examState.questions.map((q, idx) => {
                        const detail = r.details.find(d => d.id === q.id);
                        const isExplaining = examState.explanation?.id === q.id;
                        return (
                            <div key={q.id} className={`bg-white dark:bg-zinc-900 p-8 rounded-3xl border-2 ${detail.correct ? 'border-emerald-100' : 'border-rose-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${detail.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{detail.correct ? 'Acerto' : 'Erro'}</span>
                                    <button onClick={() => handleExplainQuestion(q.id)} className="text-xs font-black text-amber-600">Explicação IA</button>
                                </div>
                                <p className="font-bold mb-4">{q.text}</p>
                                <p className="text-sm mb-2"><span className="font-black">Sua resposta:</span> {config.modality === 'open' ? examState.answers[q.id] : q.options[examState.answers[q.id]]}</p>
                                <p className="text-sm mb-4"><span className="font-black">Gabarito:</span> {config.modality === 'open' ? q.standardAnswer : q.options[q.correct]}</p>
                                {isExplaining && <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-sm italic">{examState.explanation.text}</div>}
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setView('setup')} className="w-full mt-10 py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black text-xl">Novo Simulado</button>
            </div>
        );
    }
    return null;
};

export default ElaboradorTab;
