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
                        { role: 'user', parts: [{ text: "Transcreva o texto médico desta imagem." }, { inlineData: { mimeType: 'image/jpeg', data: b64.split(',')[1] } }] }
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
                showAlert("✅ Arquivo carregado!");
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const generateExam = async () => {
        if (!config.subject.trim() && !examState.materialText) return showAlert("Defina o assunto!");
        setExamState(p => ({ ...p, isGenerating: true }));
        try {
            const finalPrompt = `Gere simulado médico: ${config.num} questões. Modalidade: ${config.modality}. Dificuldade: ${config.difficulty}. Retorne JSON Array.`;
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
        setExamState(p => ({ ...p, endTime: Date.now(), isCorrecting: true }));
        try {
            if (config.modality === 'open') {
                const prompt = `Corrija as questões discursivas. Retorne JSON: { "score": 0-100, "details": [...] }`;
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
            const res = await callIA([{ role: 'user', parts: [{ text: `Explique a questão: ${q.text}` }] }]);
            setExamState(p => ({ ...p, explanation: { id: qId, text: res } }));
        } catch (e) {
            setExamState(p => ({ ...p, explanation: { id: qId, text: 'Erro' } }));
        }
    };

    const generateFlashcardsFromErrors = () => {
        const errors = examState.results.details.filter(d => !d.correct);
        if (errors.length === 0) return showAlert("Sem erros!");
        const newCards = errors.map(d => {
            const q = examState.questions.find(x => x.id === d.id);
            return { id: Date.now() + Math.random(), deckName: `Erros: ${config.subject}`, front: q.text, back: d.feedback, date: new Date().toLocaleDateString() };
        });
        setDb(p => ({ ...p, flashcards: [...newCards, ...(p.flashcards || [])] }));
        showAlert("Cards gerados!");
    };

    if (view === 'setup') {
        return (
            <div className="p-6 md:p-12 max-w-6xl mx-auto">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
                        <i className="fa-solid fa-wand-magic-sparkles text-amber-500"></i> Elaborador <span className="text-xs bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full uppercase ml-2">PRO</span>
                    </h2>
                    <div className="space-y-6">
                        <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} placeholder="Assunto" className="w-full p-6 bg-zinc-50 dark:bg-zinc-950 border rounded-3xl outline-none" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border">
                                <label className="block text-xs font-black text-zinc-400 uppercase mb-4">Questões</label>
                                <input type="range" min="5" max="50" step="5" value={config.num} onChange={e => setConfig({...config, num: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                                <span className="text-2xl font-black text-amber-600">{config.num}</span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border">
                                <label className="block text-xs font-black text-zinc-400 uppercase mb-4">Dificuldade</label>
                                <div className="flex gap-2">
                                    {['fácil', 'mediana', 'difícil', 'impossivel'].map(d => (
                                        <button key={d} onClick={() => setConfig({...config, difficulty: d})} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${config.difficulty === d ? 'bg-amber-500 text-white' : 'bg-white text-zinc-400 border'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button disabled={examState.isGenerating} onClick={generateExam} className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black text-xl">
                            {examState.isGenerating ? 'Gerando...' : 'Gerar Simulado'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'exam') {
        const q = examState.questions[examState.currentIdx];
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border shadow-xl">
                    <p className="text-xl font-bold mb-8">{q.text}</p>
                    <div className="space-y-4">
                        {q.options?.map((opt, idx) => (
                            <button key={idx} onClick={() => setExamState(p => ({ ...p, answers: { ...p.answers, [q.id]: idx } }))} className={`w-full p-6 rounded-2xl border-2 text-left font-bold ${examState.answers[q.id] === idx ? 'border-amber-500 bg-amber-50' : 'bg-zinc-50'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-between">
                        <button disabled={examState.currentIdx === 0} onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx - 1 }))} className="px-6 py-3 bg-zinc-100 rounded-xl font-bold">Anterior</button>
                        {examState.currentIdx === examState.questions.length - 1 ? (
                            <button onClick={finalizeExam} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold">Finalizar</button>
                        ) : (
                            <button onClick={() => setExamState(p => ({ ...p, currentIdx: p.currentIdx + 1 }))} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold">Próxima</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results') {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h2 className="text-5xl font-black mb-8">{examState.results.score}%</h2>
                <button onClick={() => setView('setup')} className="px-12 py-5 bg-zinc-900 text-white rounded-2xl font-black">Novo Simulado</button>
            </div>
        );
    }

    return null;
};

export default ElaboradorTab;
