import React, { useState } from 'react';

const ResumosHtmlTab = ({ db, setDb, showAlert, callIA }) => {
    const [htmlSummaryState, setHtmlSummaryState] = useState({ view: 'list', search: '', editor: { id: null, title: '', category: '', content: '', materialText: '', isGenerating: false, aiPrompt: '' } });

    const summariesList = db.summariesHtml || [];
    const filteredList = summariesList.filter(s => {
        if (!htmlSummaryState.search.trim()) return true;
        const term = htmlSummaryState.search.toLowerCase();
        return (s.title && s.title.toLowerCase().includes(term)) || 
               (s.category && s.category.toLowerCase().includes(term));
    });

    const extractTextFromPDF = async (data) => {
        // Assume pdfjsLib is available globally or passed via props. 
        // In a real Vite app, we should import it, but keeping it simple for now as it was in index.html
        if (!window.pdfjsLib) throw new Error("PDF.js não carregado.");
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
            throw new Error("Falha ao extrair texto do PDF. O arquivo pode estar protegido ou corrompido.");
        }
    };

    const saveSummary = () => {
        const { id, title, category, content } = htmlSummaryState.editor;
        if (!title.trim()) return showAlert("O resumo precisa de um título!");
        if (!content.trim()) return showAlert("O conteúdo HTML não pode estar vazio!");

        setDb(p => {
            const existing = (p.summariesHtml || []).find(x => x.id === id);
            let updated;
            if (existing) {
                updated = p.summariesHtml.map(x => x.id === id ? { ...x, title, category, content, date: new Date().toLocaleDateString('pt-PT') } : x);
            } else {
                updated = [{ id: id || Date.now(), title, category, content, date: new Date().toLocaleDateString('pt-PT') }, ...(p.summariesHtml || [])];
            }
            return { ...p, summariesHtml: updated };
        });

        showAlert("✅ Resumo HTML salvo com sucesso!");
        setHtmlSummaryState(p => ({ ...p, view: 'list' }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const name = file.name.toLowerCase();
        const isHtml = name.endsWith('.html') || name.endsWith('.htm');
        const isPdf = name.endsWith('.pdf');
        const isTxt = name.endsWith('.txt');

        if (isHtml) {
            reader.onload = (ev) => {
                const content = ev.target.result;
                setHtmlSummaryState(p => ({
                    ...p, view: 'edit',
                    editor: { ...p.editor, id: Date.now(), title: file.name.replace(/\.html?$/i, ''), category: 'Geral', content, materialText: '', isGenerating: false, aiPrompt: '' }
                }));
            };
            reader.readAsText(file);
        } else if (isPdf) {
            setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: true } }));
            reader.onload = async (ev) => {
                try {
                    const typedarray = new Uint8Array(ev.target.result);
                    const text = await extractTextFromPDF(typedarray);
                    setHtmlSummaryState(p => ({
                        ...p, view: 'edit',
                        editor: { ...p.editor, id: Date.now(), title: file.name.replace(/\.pdf$/i, ''), category: 'Geral', content: '', materialText: text, isGenerating: false, aiPrompt: '' }
                    }));
                    showAlert("✅ PDF processado! O material foi extraído. Agora use o Mentor IA para gerar o resumo de elite.");
                } catch (err) {
                    setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: false } }));
                    showAlert("❌ Erro ao ler PDF: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (isTxt) {
            reader.onload = (ev) => {
                const text = ev.target.result;
                setHtmlSummaryState(p => ({
                    ...p, view: 'edit',
                    editor: { ...p.editor, id: Date.now(), title: file.name.replace(/\.txt$/i, ''), category: 'Geral', content: '', materialText: text, isGenerating: false, aiPrompt: '' }
                }));
                showAlert("✅ Arquivo de texto carregado! Use o Mentor IA para gerar o resumo.");
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const injectSnippet = (snippet) => {
        setHtmlSummaryState(p => ({
            ...p,
            editor: {
                ...p.editor,
                content: p.editor.content + snippet
            }
        }));
    };

    const generateWithAI = async () => {
        const { aiPrompt, materialText } = htmlSummaryState.editor;
        if (!aiPrompt.trim() && !materialText.trim()) return showAlert("Digite o tema ou forneça um material (PDF/TXT) para a IA gerar o resumo.");
        
        setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: true } }));
        
        const sysInstruction = `Você é um Professor de Medicina de Elite criando um resumo EXTREMAMENTE DETALHADO, LONGO E APROFUNDADO em formato HTML puro.
        O usuário espera um conteúdo denso, com múltiplas seções, tabelas comparativas, critérios diagnósticos completos e mnemônicas de memorização.
        
        ESTRUTURA OBRIGATÓRIA:
        1. Utilize Tailwind CSS (light/dark mode) para um design premium.
        2. Use <h3> para seções principais e <h4> para subseções com cores como text-emerald-600 dark:text-emerald-400.
        3. SEMPRE inclua pelo menos uma tabela estilizada se houver dados comparativos.
        4. Use blocos de destaque (bg-emerald-50, bg-red-50, etc) para avisos importantes.
        5. O resumo deve ser EXTENSO e COMPLETO. Não economize palavras. Explore cada detalhe.
        6. Retorne apenas o conteúdo HTML interno, sem tags <html>, <head> ou <body>.
        7. Utilize técnicas de "Chain-of-Thought" para estruturar o raciocínio clínico.`;

        const userMessage = materialText 
            ? `ESTUDE O MATERIAL ABAIXO E CRIE UM RESUMO EXTREMAMENTE COMPLETO E DETALHADO SOBRE ELE:\n\nMATERIAL: ${materialText}\n\nINSTRUÇÕES ADICIONAIS DO ALUNO: ${aiPrompt}`
            : `TEMA DO RESUMO: ${aiPrompt}`;

        const res = await callIA([
            { role: 'user', parts: [{ text: `${sysInstruction}\n\n${userMessage}` }] }
        ]);

        setHtmlSummaryState(p => ({
            ...p,
            editor: {
                ...p.editor,
                isGenerating: false,
                content: res ? res.replace(/```html|```/g, '').trim() : p.editor.content
            }
        }));

        if (!res) showAlert("❌ Falha ao gerar resumo com a IA.");
        else showAlert("✨ Resumo de Elite gerado com sucesso! Verifique a profundidade do conteúdo.");
    };

    const smartModifyWithAI = async () => {
        const prompt = htmlSummaryState.editor.aiPrompt;
        const currentContent = htmlSummaryState.editor.content;

        if (!currentContent || !currentContent.trim()) return showAlert("⚠️ O resumo atual está vazio.");
        if (!prompt.trim()) return showAlert("⚠️ Digite o que deseja alterar.");

        setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: true } }));

        const sysInstruction = `Você é um Assistente de Elite. Aplique a modificação solicitada no resumo HTML preservando o estilo premium.
        CÓDIGO ATUAL:
        ${currentContent}
        INSTRUÇÃO DE MUDANÇA: "${prompt}"
        Retorne apenas o novo código HTML completo, sem explicações.`;

        const res = await callIA([{ role: 'user', parts: [{ text: sysInstruction }] }]);

        if (res) {
            setHtmlSummaryState(p => ({
                ...p,
                editor: { ...p.editor, isGenerating: false, content: res.replace(/```html|```/g, '').trim() }
            }));
            showAlert("✨ Resumo atualizado inteligentemente!");
        } else {
            setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: false } }));
            showAlert("❌ Falha na modificação.");
        }
    };

    if (htmlSummaryState.view === 'edit') {
        const ed = htmlSummaryState.editor;
        return (
            <div className="p-6 space-y-6 animate-in fade-in max-w-[1600px] mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'list' }))} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                            <i className="fa-solid fa-arrow-left text-zinc-500"></i>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                                <i className="fa-solid fa-file-code"></i> {ed.id ? "Editar Resumo HTML" : "Novo Resumo HTML"}
                            </h2>
                            <p className="text-xs font-bold text-zinc-400">Extraia conhecimento de PDFs/Textos ou gere direto com a IA.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {ed.materialText && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                                <i className="fa-solid fa-file-lines text-emerald-500"></i>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Material Carregado</span>
                                <button onClick={() => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, materialText: '' } }))} className="text-emerald-400 hover:text-red-500"><i className="fa-solid fa-circle-xmark"></i></button>
                            </div>
                        )}
                        <button onClick={saveSummary} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm">
                            <i className="fa-solid fa-floppy-disk"></i> Salvar Resumo
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={ed.title} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, title: e.target.value } }))} placeholder="Título do Resumo" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-800 dark:text-zinc-100" />
                    <input type="text" value={ed.category} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, category: e.target.value } }))} placeholder="Categoria / Disciplina" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-800 dark:text-zinc-100" />
                </div>

                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/20 flex flex-col md:flex-row gap-3 items-center">
                    <i className="fa-solid fa-wand-magic-sparkles text-emerald-500 text-lg"></i>
                    <input type="text" value={ed.aiPrompt} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, aiPrompt: e.target.value } }))} placeholder={ed.materialText ? "O que extrair do material?" : "O que deseja gerar ou alterar?"} className="flex-1 p-3 rounded-xl bg-white dark:bg-zinc-950 border border-emerald-500/30 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100" />
                    <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                        <button onClick={generateWithAI} disabled={ed.isGenerating} className="flex-1 md:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md">
                            {ed.isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-robot mr-1"></i> {ed.materialText ? 'Gerar do Material' : 'Gerar do Zero'}</>}
                        </button>
                        <button onClick={smartModifyWithAI} disabled={ed.isGenerating} className="flex-1 md:flex-initial px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs shadow-md">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> Modificar com IA
                        </button>
                    </div>
                </div>

                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Componentes de Elite:</span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: 'Título', icon: 'fa-heading', code: '\n<h3 class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-6 mb-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-2 flex items-center gap-2"><i class="fa-solid fa-stethoscope"></i> Seção</h3>\n' },
                            { label: 'Alerta', icon: 'fa-triangle-exclamation', code: '\n<div class="p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-r-2xl text-red-800 dark:text-red-300 font-bold my-4 shadow-sm">Alerta Médica</div>\n' },
                            { label: 'Dica', icon: 'fa-lightbulb', code: '\n<div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-2xl text-emerald-800 dark:text-emerald-300 font-bold my-4 shadow-sm">Dica de Elite</div>\n' },
                            { label: 'Tabela', icon: 'fa-table', code: '\n<div class="overflow-x-auto my-4"><table class="w-full border border-zinc-200 dark:border-zinc-800 text-sm"><tr><th class="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">Item</th><th class="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">Valor</th></tr><tr><td class="p-3 border-b border-zinc-200 dark:border-zinc-800">A</td><td class="p-3 border-b border-zinc-200 dark:border-zinc-800">B</td></tr></table></div>\n' }
                        ].map((snip, i) => (
                            <button key={i} onClick={() => injectSnippet(snip.code)} className="px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs">
                                <i className={`fa-solid ${snip.icon} text-emerald-500`}></i> {snip.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                    <div className="flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Código HTML</span>
                            <button onClick={() => navigator.clipboard.writeText(ed.content).then(() => showAlert('Copiado!'))} className="text-zinc-400 hover:text-zinc-600 text-xs font-bold transition-colors">Copiar</button>
                        </div>
                        <textarea value={ed.content} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, content: e.target.value } }))} placeholder="Código HTML..." className="flex-1 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 outline-none font-mono text-xs resize-none overflow-y-auto" />
                    </div>
                    <div className="flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Preview Live</span>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                            {ed.content.trim() ? <div dangerouslySetInnerHTML={{ __html: ed.content }} className="prose prose-sm dark:prose-invert max-w-none" /> : <div className="h-full flex flex-col items-center justify-center text-zinc-300 italic font-bold">Preview do Resumo aparecerá aqui.</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 space-y-6 sm:space-y-8 animate-in fade-in max-w-[1600px] mx-auto w-full">
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-500 mb-1 sm:mb-2 flex items-center gap-3">
                        <i className="fa-solid fa-file-code text-2xl sm:text-4xl"></i> Resumos HTML
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-zinc-400 max-w-xl">Crie estudos aprofundados. Aceita <b>PDF, TXT e HTML</b> para ingestão direta.</p>
                </div>
                <div className="flex flex-wrap gap-2.5 sm:gap-3 w-full lg:w-auto relative z-10 shrink-0">
                    <div className="relative group flex-1 sm:flex-initial">
                        <input type="file" accept=".html,.htm,.pdf,.txt" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <button className="w-full sm:w-auto px-4 py-3 sm:py-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-black rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 text-[11px] sm:text-sm border border-zinc-200 dark:border-zinc-800">
                            <i className="fa-solid fa-file-import"></i> Alimentar
                        </button>
                    </div>
                    <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'edit', editor: { id: null, title: '', category: 'Clínica Médica', content: '<h3 class="text-xl font-black text-emerald-600 dark:text-emerald-400 mb-4">Conceitos Iniciais</h3>\n<p>Escreva o resumo aqui...</p>', isGenerating: false, aiPrompt: '', materialText: '' } }))} className="flex-1 sm:flex-initial px-4 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl sm:rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-[11px] sm:text-sm">
                        <i className="fa-solid fa-plus"></i> Novo Resumo
                    </button>
                </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"></i>
                <input
                    type="text"
                    value={htmlSummaryState.search}
                    onChange={e => setHtmlSummaryState(p => ({ ...p, search: e.target.value }))}
                    placeholder="Filtrar por título ou categoria..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
                />
            </div>

            {/* Grid de Resumos HTML */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredList.map(item => (
                    <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
                        <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/40">
                                    {item.category || 'Geral'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">{item.date}</span>
                            </div>
                            <h4 className="font-black text-lg text-zinc-800 dark:text-zinc-100 mb-2 leading-tight group-hover:text-emerald-500 transition-colors">{item.title}</h4>
                            
                            {/* Mini Preview */}
                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/60 max-h-24 overflow-hidden relative my-3">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 select-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 to-transparent"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                            <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'edit', editor: { id: item.id, title: item.title, category: item.category || '', content: item.content, isGenerating: false, aiPrompt: '' } }))} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-xs transition-all flex items-center gap-1.5">
                                <i className="fa-solid fa-pen"></i> Editar / Abrir
                            </button>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => {
                                    const blob = new Blob([item.content], { type: 'text/html;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
                                    a.click(); URL.revokeObjectURL(url);
                                }} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 flex items-center justify-center transition-all" title="Baixar arquivo .html">
                                    <i className="fa-solid fa-download text-xs"></i>
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(item.content).then(() => showAlert('HTML copiado!'))} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 flex items-center justify-center transition-all" title="Copiar HTML">
                                    <i className="fa-solid fa-copy text-xs"></i>
                                </button>
                                <button onClick={() => {
                                    if (window.confirm('Excluir permanentemente este resumo em HTML?')) {
                                        setDb(p => ({ ...p, summariesHtml: (p.summariesHtml || []).filter(x => x.id !== item.id) }));
                                    }
                                }} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 text-zinc-400 transition-all flex items-center justify-center" title="Excluir">
                                    <i className="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredList.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-code text-2xl"></i>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 font-black text-lg mb-1">Nenhum resumo em HTML encontrado.</p>
                        <p className="text-zinc-400 text-xs font-bold max-w-sm mx-auto">Crie seu primeiro resumo com ricas formatações ou faça upload de arquivos .html existentes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumosHtmlTab;
