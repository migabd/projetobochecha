import React, { useState } from 'react';

const ERROR_REASONS = ["Desatenção", "Falta de Base", "Esquecimento", "Raciocínio", "Pegadinha"];

const ElaboradorTab = ({ db, setDb, showAlert, callIA, aiConfig, setSimulado }) => {
    const [state, setState] = useState({
        isGenerating: false,
        status: 'idle',
        settings: {
            type: 'multiple',
            difficulty: 'difícil',
            qty: 5,
            focus: '',
            customTag: ''
        },
        questions: [],
        fileData: null,
        fileName: '',
        mimeType: '',
        isConverting: false,
        convertFilter: '',
        convertTargetType: 'ce',
        convertQty: 5,
        originalIdsToMarkTransformed: []
    });

    const [lightbox, setLightbox] = useState(null);

    const compressImage = (base64) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 1200;
                if (width > height && width > max) { height *= max / width; width = max; }
                else if (height > max) { width *= max / height; height = max; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            let b64 = ev.target.result;
            let mime = file.type || 'application/octet-stream';
            if (mime.startsWith('image/')) b64 = await compressImage(b64);
            setState(p => ({ ...p, fileData: b64, mimeType: mime, fileName: file.name }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const generateQuestions = async () => {
        setState(p => ({ ...p, isGenerating: true, status: 'generating' }));
        try {
            const { type, difficulty, qty, focus } = state.settings;
            let typeInst = "Múltipla Escolha com 5 alternativas (A a E)";
            if (type === 'ce') typeInst = "Certo ou Errado com apenas 2 alternativas: ['A) Certo', 'B) Errado']";
            if (type === 'discursiva') typeInst = "Discursiva com apenas 1 alternativa representando o espelho de correção: ['A) Espelho de Resposta: ...']";

            const prompt = `Atue como o examinador médico mais carrasco, impiedoso e exigente do mundo, padrão de excelência extrema de nível UTI.
Crie EXATAMENTE ${qty} questões do tipo: ${typeInst}. NÃO crie nem mais, nem menos do que o solicitado.
Nível de dificuldade: ${difficulty.toUpperCase()} (questões de hipercomplexidade clínica, raciocínio de multi-etapas, desenhadas para derrubar até especialistas, repletas de pegadinhas cruéis e detalhes vitais escondidos no enunciado).
Tema/Foco opcional: ${focus || 'Baseado estritamente no documento ou imagem anexado'}.

${state.fileData ? 'NOTA DE VISÃO: Analise cuidadosamente a imagem ou documento fornecido. Se for uma imagem médica (RX, TC, Foto Clínica, ECG), baseie o caso clínico nos achados visuais. Se for um texto/PDF, use os dados fornecidos.' : ''}

INSTRUÇÃO CRÍTICA DE VARIEDADE (Seed: ${Date.now()}): É OBRIGATÓRIO que as questões sejam COMPLETAMENTE NOVAS e INÉDITAS. Explore ângulos clínicos inusitados, rodapés de livro, complicações raras, exceções à regra e cenários diagnósticos confusos. NÃO repita o mesmo padrão, foco ou doença principal que seria gerado por padrão. Fuja do óbvio!

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem nenhum texto extra e sem formatação markdown.
[
  {
    "title": "Tema curto da questão",
    "question": "Enunciado clinicamente denso...",
    "alternatives": ["A) ...", "B) ..."],
    "alternativeExplanations": ["Exp A", "Exp B"],
    "correctAlternative": "A",
    "lessonLearned": "O detalhe matador desta questão."
  }
]`;
            
            const visionModel = (!aiConfig.key || aiConfig.model.includes('gemma')) ? 'gemini-1.5-flash' : null;
            let msgs = [];
            if (state.fileData) {
                msgs = [{ role: 'user', parts: [{ inlineData: { data: state.fileData.split(',')[1], mimeType: state.mimeType } }, { text: prompt }] }];
            } else {
                msgs = [{ role: 'user', parts: [{ text: prompt }] }];
            }

            const res = await callIA(msgs, visionModel);
            if (res && !res.startsWith('[ERRO')) {
                const match = res.match(/\[[\s\S]*\]/);
                if (!match) throw new Error("JSON não encontrado na resposta");
                let generated = JSON.parse(match[0]);
                if (Array.isArray(generated)) {
                    generated = generated.slice(0, qty).map(q => ({
                        ...q,
                        tags: [...(q.tags || []), ...(state.settings.customTag ? [state.settings.customTag] : [])]
                    }));
                }
                setState(p => ({ ...p, questions: generated, status: 'done', isGenerating: false }));
                showAlert(`✅ ${generated.length} questões geradas com sucesso!`);
            } else {
                throw new Error(res);
            }
        } catch (err) {
            console.error(err);
            showAlert("❌ Erro na geração: " + err.message);
            setState(p => ({ ...p, isGenerating: false, status: 'error' }));
        }
    };

    const convertQuestions = async () => {
        if (!state.convertFilter) return showAlert("Selecione um filtro válido para converter.");
        let pool = db.errors.filter(e => e.examId === state.convertFilter || e.facId === state.convertFilter || (e.tags && e.tags.includes(state.convertFilter)));
        if (pool.length === 0) return showAlert("Nenhuma questão encontrada.");

        const qty = Math.min(Number(state.convertQty) || 5, pool.length);
        const selectedPool = pool.slice(0, qty);
        const originalIds = selectedPool.map(q => q.id);

        setState(p => ({ ...p, isConverting: true, status: 'generating', originalIdsToMarkTransformed: originalIds }));
        try {
            const targetType = state.convertTargetType;
            let typeInst = "Múltipla Escolha com 5 alternativas (A a E)";
            if (targetType === 'ce') typeInst = "Certo ou Errado com apenas 2 alternativas: ['A) Certo', 'B) Errado']";
            if (targetType === 'discursiva') typeInst = "Discursiva com apenas 1 alternativa representando o espelho de correção: ['A) Espelho de Resposta: ...']";

            const questionsJSON = JSON.stringify(selectedPool.map(q => ({ title: q.title, question: q.question, alternatives: q.alternatives, correctAlternative: q.correctAlternative })));
            const prompt = `Atue como um Professor de Medicina. Transforme estas questões para o formato: ${typeInst}.\n\nQUESTÕES:\n${questionsJSON}\n\nRetorne apenas JSON.`;

            const res = await callIA([{ role: 'user', parts: [{ text: prompt }] }]);
            if (res && !res.startsWith('[ERRO')) {
                const match = res.match(/\[[\s\S]*\]/);
                if (!match) throw new Error("JSON não encontrado");
                let generated = JSON.parse(match[0]);
                setState(p => ({ ...p, questions: generated, status: 'done', isConverting: false }));
                showAlert(`✅ ${generated.length} questões convertidas!`);
            } else {
                throw new Error(res);
            }
        } catch (err) {
            showAlert("❌ Erro: " + err.message);
            setState(p => ({ ...p, isConverting: false, status: 'error' }));
        }
    };

    const saveToPlatform = () => {
        const name = prompt("Nome da lista:");
        if (!name) return;
        const newList = {
            id: Date.now().toString(),
            name,
            date: new Date().toLocaleDateString('pt-PT'),
            questions: state.questions.map((q, i) => ({ ...q, id: Date.now() + i }))
        };
        setDb(p => ({ ...p, processedQuestionLists: [newList, ...(p.processedQuestionLists || [])] }));
        showAlert("✅ Lista salva!");
    };

    const saveToCaderno = () => {
        const newErrors = state.questions.map((q, i) => ({
            id: Date.now() + i,
            date: new Date().toLocaleDateString('pt-PT'),
            title: q.title || 'Gerada',
            subject: db.subjects[0]?.id || 'clinica_medica',
            question: q.question,
            alternatives: q.alternatives,
            alternativeExplanations: q.alternativeExplanations,
            correctAlternative: q.correctAlternative,
            lessonLearned: q.lessonLearned || '',
            reason: ERROR_REASONS[0],
            tags: [...(q.tags || []), 'Gerada por IA', 'Elaborador']
        }));
        setDb(p => ({ ...p, errors: [...newErrors, ...p.errors] }));
        showAlert("✅ Salvas no Caderno Geral!");
        setState(p => ({ ...p, questions: [], status: 'idle' }));
    };

    const solveNow = () => {
        const deck = state.questions.map((q, i) => ({
            ...q,
            id: 'tmp_' + Date.now() + '_' + i,
            date: new Date().toLocaleDateString('pt-PT'),
            subject: db.subjects[0]?.id || 'clinica_medica',
            tags: [...(q.tags || []), 'Gerada por IA', 'Elaborador']
        }));
        setDirectSimulado(deck);
        setActiveTab('simulados');
        setState(p => ({ ...p, questions: [], status: 'idle' }));
    };

    const printPDF = () => {
        const win = window.open('', '_blank');
        let html = `<html><head><title>Lista de Questões</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;}.q{margin-bottom:40px;page-break-inside:avoid;}h1{color:#059669;}</style></head><body><h1>Desafio de Elite</h1>`;
        state.questions.forEach((q, i) => {
            html += `<div class="q"><h3>Q${i+1}. ${q.title}</h3><p>${q.question}</p><ul>${q.alternatives.map(a => `<li>${a}</li>`).join('')}</ul></div>`;
        });
        html += `<hr/><h2>Gabarito</h2>`;
        state.questions.forEach((q, i) => { html += `<p>Q${i+1}: ${q.correctAlternative} - ${q.lessonLearned}</p>`; });
        html += `</body></html>`;
        win.document.write(html); win.document.close(); win.print();
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 text-zinc-900 dark:text-zinc-100">
            <div className="bg-gradient-to-br from-emerald-900 to-zinc-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden border border-emerald-800">
                <div className="absolute -right-10 -top-10 text-emerald-500/10"><i className="fa-solid fa-wand-magic-sparkles text-[250px]"></i></div>
                <div className="relative z-10">
                    <h2 className="text-3xl lg:text-4xl font-black text-white mb-2"><i className="fa-solid fa-flask text-emerald-400 mr-3"></i> Elaborador de Elite</h2>
                    <p className="text-emerald-100/70 font-medium">Extraia o suco do seu material. Gere questões de altíssima complexidade.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
                    <h3 className="font-black text-lg mb-4 text-emerald-600 dark:text-emerald-400 border-b border-zinc-100 dark:border-zinc-800 pb-3">Parâmetros</h3>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Formato</label>
                        <select value={state.settings.type} onChange={e => setState(p => ({ ...p, settings: { ...p.settings, type: e.target.value } }))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm font-bold">
                            <option value="multiple">Múltipla Escolha</option>
                            <option value="ce">Certo ou Errado</option>
                            <option value="discursiva">Discursiva</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Dificuldade</label>
                        <select value={state.settings.difficulty} onChange={e => setState(p => ({ ...p, settings: { ...p.settings, difficulty: e.target.value } }))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm font-bold text-red-500">
                            <option value="difícil">Difícil</option>
                            <option value="extremo">Extremo (R4)</option>
                            <option value="uti">UTI (Impossível)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1">Quantidade</label>
                        <input type="number" min="1" max="20" value={state.settings.qty} onChange={e => setState(p => ({ ...p, settings: { ...p.settings, qty: e.target.value } }))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm font-bold" />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className={`bg-white dark:bg-zinc-900 p-8 rounded-3xl border-2 border-dashed ${state.fileData ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-800'} flex flex-col items-center justify-center text-center h-full min-h-[300px] relative group`}>
                        <input type="file" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        {!state.fileData ? (
                            <>
                                <i className="fa-solid fa-cloud-arrow-up text-4xl text-emerald-500 mb-4"></i>
                                <h3 className="font-black text-xl mb-2">Anexar Material</h3>
                                <p className="text-sm text-zinc-500">PDF, Imagens, PPT ou Docs</p>
                            </>
                        ) : (
                            <div className="z-20">
                                <i className="fa-solid fa-file-circle-check text-4xl text-emerald-500 mb-4"></i>
                                <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs mb-4 flex items-center gap-2">
                                    {state.fileName}
                                    <button onClick={() => setState(p => ({ ...p, fileData: null, fileName: '' }))} className="hover:text-red-200"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                            </div>
                        )}
                        <button disabled={state.isGenerating} onClick={generateQuestions} className="mt-6 z-30 px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50">
                            {state.isGenerating ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>}
                            Gerar Questões de Elite
                        </button>
                    </div>
                </div>
            </div>

            {state.questions.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800">
                        <h3 className="font-black text-xl text-emerald-700 dark:text-emerald-400">{state.questions.length} Questões Prontas</h3>
                        <div className="flex gap-2">
                            <button onClick={printPDF} className="bg-white dark:bg-zinc-800 text-emerald-600 px-4 py-2 rounded-xl font-black text-xs shadow-sm">PDF</button>
                            <button onClick={solveNow} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg">Resolver Agora</button>
                            <button onClick={saveToCaderno} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg">Salvar no Caderno</button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {state.questions.map((q, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h4 className="font-black text-lg mb-4 text-emerald-600">Q{i+1}. {q.title}</h4>
                                <p className="text-zinc-700 dark:text-zinc-300 mb-6 font-medium whitespace-pre-wrap">{q.question}</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {q.alternatives.map((alt, j) => (
                                        <div key={j} className={`p-4 rounded-xl border-2 ${q.correctAlternative === String.fromCharCode(65+j) ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'} text-sm font-bold flex gap-3`}>
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${q.correctAlternative === String.fromCharCode(65+j) ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-500'}`}>{String.fromCharCode(65+j)}</span>
                                            {alt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElaboradorTab;
