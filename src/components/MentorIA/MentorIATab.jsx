import React, { useState, useEffect, useRef } from 'react';

const MentorIATab = ({ db, setDb, showAlert, callIA, aiLoading }) => {
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState(db.chatMessages || []);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        setDb(prev => ({ ...prev, chatMessages: messages }));
    }, [messages]);

    const handleChatSend = async () => {
        if (!chatInput.trim() || aiLoading) return;

        const userMsg = { role: 'user', text: chatInput, id: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setChatInput('');

        try {
            // Build context from platform data (briefly)
            const context = `[INSTRUÇÃO: Você é o Mentor IA PRO, um tutor médico de altíssimo nível. Responda de forma estratégica, clara e profunda. Se o usuário for sarcástico, responda à altura. Se ele pedir mnemônicos, crie os melhores. Suas respostas devem ser ricas em conteúdo médico.]\n\n`;
            
            // Format history for callIA
            const history = newMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));
            
            // Add system instruction at the beginning
            history[0].parts[0].text = context + history[0].parts[0].text;

            const res = await callIA(history);
            
            if (res) {
                setMessages(prev => [...prev, { role: 'model', text: res, id: Date.now() + 1 }]);
            }
        } catch (err) {
            showAlert('Erro ao consultar o mentor: ' + err.message);
        }
    };

    return (
        <div className="p-4 md:p-10 h-[calc(100vh-160px)] flex flex-col animate-in fade-in duration-700 max-w-6xl mx-auto w-full">
            <header className="mb-8 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter neon-emerald uppercase">Mentor <span className="text-white/20">IA PRO</span></h2>
                    <p className="text-zinc-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Consultoria Médica Estratégica & Mnemônicos de Elite.</p>
                </div>
                <button 
                    onClick={() => { if (window.confirm('Apagar histórico de chat?')) setMessages([]); }}
                    className="w-12 h-12 flex items-center justify-center bg-zinc-950 border border-white/5 text-zinc-500 hover:text-red-500 rounded-2xl transition-all shadow-xl hover:scale-110 active:scale-95"
                >
                    <i className="fa-solid fa-trash-can"></i>
                </button>
            </header>

            <div className="flex-1 flex flex-col bento-card rounded-[3rem] overflow-hidden border border-white/5 bg-zinc-950/20 shadow-2xl relative">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 chat-scroll">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                            <i className="fa-solid fa-robot text-7xl mb-6 ai-glow rounded-full p-6"></i>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">O Mentor está pronto</h3>
                            <p className="text-sm font-bold max-w-xs mt-2 uppercase tracking-widest leading-tight">Pergunte sobre diagnósticos, condutas, mnemônicos ou peça resumos de casos complexos.</p>
                        </div>
                    )}
                    
                    {messages.map((m, i) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                            <div className={`max-w-[85%] px-8 py-6 rounded-[2.5rem] shadow-2xl relative group ${m.role === 'user' ? 'bg-emerald-600 text-white ml-auto rounded-tr-none' : 'bg-zinc-900 text-zinc-100 mr-auto rounded-tl-none border border-white/5'}`}>
                                <div className="flex items-center gap-3 mb-4 border-b border-black/10 dark:border-white/10 pb-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] shadow-lg ${m.role === 'user' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-emerald-500'}`}>
                                        <i className={`fa-solid ${m.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{m.role === 'user' ? 'Residente' : 'Mentor Elite'}</span>
                                </div>
                                <div 
                                    className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium" 
                                    dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<b class="font-black text-white">$1</b>').replace(/\n/g, '<br/>') }}
                                />
                            </div>
                        </div>
                    ))}
                    
                    {aiLoading && (
                        <div className="flex justify-start animate-in fade-in slide-in-from-left-4">
                            <div className="bg-zinc-900 border border-emerald-500/30 px-8 py-5 rounded-[2.5rem] rounded-tl-none text-emerald-400 font-black text-xs flex items-center gap-4 shadow-2xl">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                                PROCESSANDO CONHECIMENTO...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-6 md:p-8 bg-zinc-950/80 backdrop-blur-3xl border-t border-white/5 flex gap-4 shrink-0">
                    <textarea 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }} 
                        placeholder="Digite sua dúvida clínica..." 
                        className="flex-1 p-5 bg-black/40 border border-white/5 rounded-[2rem] outline-none text-sm resize-none font-bold text-white focus:border-emerald-500/50 transition-all placeholder:text-zinc-700" 
                        rows="2" 
                    />
                    <button 
                        onClick={handleChatSend} 
                        disabled={!chatInput.trim() || aiLoading} 
                        className="w-20 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center transition-all hover:bg-emerald-700 active:scale-90 disabled:opacity-20 disabled:grayscale shadow-2xl shadow-emerald-600/20"
                    >
                        <i className="fa-solid fa-paper-plane text-xl"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MentorIATab;
