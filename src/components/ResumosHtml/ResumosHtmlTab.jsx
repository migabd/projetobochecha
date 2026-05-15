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
            throw new Error("Falha ao extrair texto do PDF.");
        }
    };

    const saveSummary = () => {
        const { id, title, category, content } = htmlSummaryState.editor;
        if (!title.trim()) return showAlert("Dê um título!");
        if (!content.trim()) return showAlert("Conteúdo vazio!");

        setDb(p => {
            const existing = (p.summariesHtml || []).find(x => x.id === id);
            let updated;
            if (existing) {
                updated = p.summariesHtml.map(x => x.id === id ? { ...x, title, category, content, date: new Date().toLocaleDateString() } : x);
            } else {
                updated = [{ id: id || Date.now(), title, category, content, date: new Date().toLocaleDateString() }, ...(p.summariesHtml || [])];
            }
            return { ...p, summariesHtml: updated };
        });

        showAlert("✅ Resumo salvo!");
        setHtmlSummaryState(p => ({ ...p, view: 'list' }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const name = file.name.toLowerCase();

        if (name.endsWith('.html') || name.endsWith('.htm')) {
            reader.onload = (ev) => {
                setHtmlSummaryState(p => ({
                    ...p, view: 'edit',
                    editor: { ...p.editor, id: Date.now(), title: file.name.replace(/\.html?$/i, ''), category: 'Geral', content: ev.target.result, materialText: '', isGenerating: false, aiPrompt: '' }
                }));
            };
            reader.readAsText(file);
        } else if (name.endsWith('.pdf')) {
            setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: true } }));
            reader.onload = async (ev) => {
                try {
                    const text = await extractTextFromPDF(new Uint8Array(ev.target.result));
                    setHtmlSummaryState(p => ({
                        ...p, view: 'edit',
                        editor: { ...p.editor, id: Date.now(), title: file.name.replace(/\.pdf$/i, ''), category: 'Geral', content: '', materialText: text, isGenerating: false, aiPrompt: '' }
                    }));
                    showAlert("✅ PDF processado!");
                } catch (err) {
                    setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: false } }));
                    showAlert("❌ Erro: " + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = '';
    };

    const injectSnippet = (snippet) => {
        setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, content: p.editor.content + snippet } }));
    };

    const generateWithAI = async () => {
        const { aiPrompt, materialText } = htmlSummaryState.editor;
        setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: true } }));
        try {
            const res = await callIA([{ role: 'user', parts: [{ text: `Gere um resumo médico detalhado em HTML sobre: ${aiPrompt || materialText}` }] }]);
            setHtmlSummaryState(p => ({
                ...p, editor: { ...p.editor, isGenerating: false, content: res ? res.replace(/```html|```/g, '').trim() : p.editor.content }
            }));
            showAlert("✨ Resumo gerado!");
        } catch (e) {
            setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, isGenerating: false } }));
            showAlert("❌ Erro.");
        }
    };

    if (htmlSummaryState.view === 'edit') {
        const ed = htmlSummaryState.editor;
        return (
            <div className="p-6 space-y-6 animate-in fade-in max-w-[1600px] mx-auto w-full">
                <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl border shadow-sm">
                    <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'list' }))} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center transition-all">
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <button onClick={saveSummary} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black shadow-md">Salvar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={ed.title} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, title: e.target.value } }))} placeholder="Título" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border font-bold" />
                    <input type="text" value={ed.category} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, category: e.target.value } }))} placeholder="Categoria" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border font-bold" />
                </div>

                <div className="bg-emerald-50 p-5 rounded-2xl border flex gap-3 items-center">
                    <input type="text" value={ed.aiPrompt} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, aiPrompt: e.target.value } }))} placeholder="Comando para IA..." className="flex-1 p-3 rounded-xl border" />
                    <button onClick={generateWithAI} disabled={ed.isGenerating} className="px-5 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs">
                        {ed.isGenerating ? '...' : 'Gerar'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                    <textarea value={ed.content} onChange={e => setHtmlSummaryState(p => ({ ...p, editor: { ...p.editor, content: e.target.value } }))} className="p-4 bg-zinc-50 rounded-3xl outline-none font-mono text-xs resize-none" />
                    <div className="p-8 overflow-y-auto bg-white dark:bg-zinc-950 rounded-3xl border prose dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: ed.content }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in max-w-[1600px] mx-auto">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border flex flex-col lg:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mb-2">Resumos HTML</h2>
                    <p className="text-xs font-bold text-zinc-400">Estudos aprofundados com formatação rica.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <input type="file" accept=".html,.htm,.pdf,.txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black rounded-xl">Alimentar</button>
                    </div>
                    <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'edit', editor: { id: null, title: '', category: '', content: '', isGenerating: false, aiPrompt: '', materialText: '' } }))} className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg">Novo Resumo</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredList.map(item => (
                    <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-3xl border p-6 shadow-md hover:shadow-xl transition-all">
                        <h4 className="font-black text-lg mb-2">{item.title}</h4>
                        <div className="flex justify-between mt-4 border-t pt-4">
                            <button onClick={() => setHtmlSummaryState(p => ({ ...p, view: 'edit', editor: { id: item.id, title: item.title, category: item.category || '', content: item.content, isGenerating: false, aiPrompt: '' } }))} className="text-emerald-600 font-black text-xs">Abrir</button>
                            <button onClick={() => setDb(p => ({ ...p, summariesHtml: (p.summariesHtml || []).filter(x => x.id !== item.id) }))} className="text-red-400"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResumosHtmlTab;
