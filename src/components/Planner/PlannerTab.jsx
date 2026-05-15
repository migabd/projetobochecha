import React, { useState } from 'react';

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const PRIORITIES = {
    high: { color: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500/30' },
    med: { color: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/30' },
    low: { color: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500/30' },
    none: { color: 'bg-zinc-600', text: 'text-zinc-400', border: 'border-white/5' }
};

const PlannerTab = ({ db, setDb, showAlert }) => {
    const [planner, setPlanner] = useState(db.planner || {});

    const updatePlanner = (day, tasks) => {
        const newPlanner = { ...planner, [day]: tasks };
        setPlanner(newPlanner);
        setDb(prev => ({ ...prev, planner: newPlanner }));
    };

    return (
        <div className="p-10 max-w-[1800px] mx-auto animate-in fade-in duration-700 h-[calc(100vh-160px)] flex flex-col">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
                <div>
                    <h2 className="text-5xl font-black italic tracking-tighter neon-emerald uppercase">Meu <span className="text-white/20">Planner</span></h2>
                    <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">Sincronize sua rotina com a performance de elite.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => { if(window.confirm('Limpar toda a semana?')) updatePlanner({}, {}); }}
                        className="px-6 py-3 bg-white/5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Limpar Semana
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto planner-scroll pb-6">
                <div className="flex gap-6 min-w-max h-full">
                    {DAYS.map(day => (
                        <DayColumn 
                            key={day} 
                            day={day} 
                            tasks={planner[day] || []} 
                            onUpdate={(tasks) => updatePlanner(day, tasks)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const DayColumn = ({ day, tasks, onUpdate }) => {
    const [input, setInput] = useState('');
    const [priority, setPriority] = useState('none');

    const addTask = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const newTask = { id: Date.now(), text: input, done: false, priority };
        onUpdate([...tasks, newTask]);
        setInput('');
        setPriority('none');
    };

    const toggleTask = (id) => {
        onUpdate(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const deleteTask = (id) => {
        onUpdate(tasks.filter(t => t.id !== id));
    };

    const doneCount = tasks.filter(t => t.done).length;
    const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

    return (
        <div className="w-80 bento-card rounded-[3rem] border border-white/5 flex flex-col h-full bg-zinc-950/20">
            <div className={`p-8 border-b border-white/5 shrink-0 ${['Sábado', 'Domingo'].includes(day) ? 'bg-emerald-500/5' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-xl tracking-tight text-white">{day}</h3>
                    <span className="text-[10px] font-black px-3 py-1 bg-white/5 rounded-full text-zinc-500 tracking-widest uppercase">{doneCount}/{tasks.length}</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 planner-scroll">
                {tasks.map(t => (
                    <div 
                        key={t.id}
                        className={`group p-4 rounded-2xl border-l-4 transition-all flex items-start gap-4 ${t.done ? 'bg-zinc-950/50 opacity-40' : 'bg-zinc-900 border border-white/5'} ${PRIORITIES[t.priority].border}`}
                    >
                        <button 
                            onClick={() => toggleTask(t.id)}
                            className={`mt-1 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all ${t.done ? 'bg-emerald-500 text-white' : 'border-2 border-zinc-700 hover:border-emerald-500'}`}
                        >
                            {t.done && <i className="fa-solid fa-check text-[10px]"></i>}
                        </button>
                        <span className={`flex-1 text-sm font-bold leading-relaxed ${t.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{t.text}</span>
                        <button 
                            onClick={() => deleteTask(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all p-1"
                        >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="py-20 text-center opacity-10">
                        <i className="fa-solid fa-calendar-check text-4xl mb-4"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nada planejado</p>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                <form onSubmit={addTask} className="space-y-4">
                    <div className="flex gap-2 justify-center">
                        {Object.entries(PRIORITIES).map(([key, p]) => (
                            <button 
                                key={key} type="button" 
                                onClick={() => setPriority(key)}
                                className={`w-3 h-3 rounded-full transition-all ${p.color} ${priority === key ? 'ring-4 ring-emerald-500/20 scale-125' : 'opacity-20 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                    <div className="relative">
                        <input 
                            type="text" value={input} 
                            onChange={e => setInput(e.target.value)}
                            placeholder="Nova tarefa..."
                            className="w-full bg-zinc-950/50 border border-white/5 rounded-xl py-3 pl-4 pr-12 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                        />
                        <button 
                            type="submit" disabled={!input.trim()}
                            className="absolute right-2 top-2 w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 disabled:opacity-20 transition-all"
                        >
                            <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlannerTab;
