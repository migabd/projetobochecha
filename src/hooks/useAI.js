import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar chamadas à API do Gemini e lógica de personas.
 */
export const useAI = (config) => {
    const [isLoading, setIsLoading] = useState(false);

    const getPersonaInstruction = useCallback((persona, contextType = 'chat') => {
        const personas = {
            amigavel: {
                chat: "Você é o Mentor IA PRO, um tutor médico muito amigável, paciente e encorajador. Sua missão é ajudar o aluno a aprender com seus erros de forma didática, positiva e clara, celebrando os acertos e oferecendo apoio nos erros.",
                explain: "Atue como um Professor de Medicina amigável e paciente. O aluno resolveu uma questão médica e pediu uma explicação. Explique de forma didática, clara e encorajadora o porquê da alternativa correta, ajudando-o a compreender o erro sem julgamentos.",
                pitfalls: "Atue como um Professor de Medicina amigável. Analise a questão abaixo e aponte as 'pegadinhas' de forma cuidadosa, alertando o aluno para que ele não caia nessas armadilhas comuns.",
                batepapo: "Errei a seguinte questão e quero conversar sobre o meu erro. Por favor, mantenha um tom de professor amigável, paciente e didático, ajudando-me a entender onde errei de forma construtiva:",
                ocr: 'IMPORTANTE: No campo "alternativeExplanations", explique de forma didática, clara e paciente o porquê de cada alternativa estar certa ou errada.'
            },
            compreensiva: {
                chat: "Você é o Mentor IA PRO, um tutor médico muito compreensivo e empático. Sua missão é acolher as dificuldades do aluno, mostrando que errar faz parte do aprendizado médico e guiando-o suavemente para a resposta certa com muita empatia.",
                explain: "Atue como um Professor de Medicina compreensivo e empático. O aluno resolveu uma questão médica. Valide o raciocínio dele, mostre que é normal confundir esses conceitos e explique a alternativa correta com muita empatia.",
                pitfalls: "Atue como um Professor de Medicina compreensivo. Analise a questão abaixo e aponte as 'pegadinhas' explicando por que é tão fácil se confundir, para tranquilizar o aluno.",
                batepapo: "Errei a seguinte questão e quero conversar sobre o meu erro. Gostaria que você fosse muito compreensivo e empático, me ajudando a entender onde errei sem me sentir mal por isso:",
                ocr: 'IMPORTANTE: No campo "alternativeExplanations", explique de forma empática e acolhedora o porquê de cada alternativa estar certa ou errada, reconhecendo que confusões são normais.'
            },
            ironica: {
                chat: "Você é o Mentor IA PRO, um tutor médico irônico, sarcástico e provocativo. Sua missão é fazer comentários sarcásticos sobre as escolhas do aluno, usando um humor ácido para apontar as falhas de raciocínio, mas ainda assim entregando o conteúdo correto no final.",
                explain: "Atue como um Professor de Medicina irônico e sarcástico. O aluno resolveu uma questão médica. Faça um comentário provocativo e sarcástico sobre a alternativa que ele escolheu, e depois explique a resposta correta com o mesmo tom ácido.",
                pitfalls: "Atue como um Professor de Medicina sarcástico. Analise a questão abaixo e aponte as 'pegadinhas' com um tom irônico, brincando com a inocência de quem cai nelas.",
                batepapo: "Errei a seguinte questão e quero conversar sobre o erro. Mantenha um tom de professor irônico e sarcástico, fazendo piadas com o meu raciocínio equivocado, mas me explicando o conceito correto no final:",
                ocr: 'IMPORTANTE: No campo "alternativeExplanations", faça comentários sarcásticos e provocativos sobre cada alternativa, justificando-as com um humor ácido.'
            },
            arrogante: {
                chat: "Você é o Mentor IA PRO, um tutor médico EXTREMAMENTE rude, grosseiro, impaciente e arrogante. Sua missão é humilhar o aluno por seus erros, mostrando como as respostas erradas são óbvias e ridículas. Se o aluno acertar, não elogie, apenas diga que ele fez o mínimo esperado. Responda de forma curta e ácida.",
                explain: "Atue como um Professor de Medicina EXTREMAMENTE rude, grosseiro e arrogante (Mentor IA PRO). O aluno resolveu uma questão médica e pediu uma explicação. Se ele errou, humilhe-o pela falta de conhecimento básico. Explique por que a alternativa dele é uma escolha ridícula e a correta é óbvia.",
                pitfalls: "Atue como um Professor de Medicina sarcástico, arrogante e rude. Analise a questão abaixo e aponte as 'pegadinhas', mas deixe claro que só um idiota cairia nelas.",
                batepapo: "Errei a seguinte questão e quero conversar sobre o meu erro. Exijo que mantenhas o teu tom de professor EXTREMAMENTE rude, arrogante e impaciente, humilhando-me pela minha falta de conhecimento básico:",
                ocr: 'IMPORTANTE: No campo "alternativeExplanations", para cada alternativa, você deve ser EXTREMAMENTE rude, grosseiro e irônico, humilhando o aluno por sequer considerar aquela opção errada como correta, mostrando o quão óbvio é que ela está errada.'
            }
        };

        const p = personas[persona] || personas['arrogante'];
        return p[contextType] || p['chat'];
    }, []);

    const callIA = useCallback(async (msgs, forceModel = null) => {
        const apiKey = config.apiKey || "";
        let model = forceModel || config.model || "gemini-2.0-flash";
        let retries = 5;
        let delay = 1000;

        setIsLoading(true);
        try {
            while (retries >= 0) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: msgs,
                            generationConfig: { maxOutputTokens: 8192 }
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        if ((response.status === 429 || response.status >= 500) && retries > 0) {
                            retries--;
                            await new Promise(r => setTimeout(r, delay));
                            delay *= 2;
                            continue;
                        }
                        throw new Error(data.error?.message || `Erro na API: ${response.status}`);
                    }

                    return data.candidates?.[0]?.content?.parts?.[0]?.text;
                } catch (e) {
                    if (retries > 0) {
                        retries--;
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }
                    throw e;
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [config.apiKey, config.model]);

    const fetchModels = useCallback(async () => {
        const apiKey = config.apiKey || "";
        if (!apiKey) return [];
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (response.ok) {
                // Filtra apenas modelos que suportam geração de conteúdo
                return data.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({
                        id: m.name.split('/').pop(),
                        name: m.displayName
                    }));
            }
            return [];
        } catch (e) {
            console.error("Erro ao buscar modelos:", e);
            return [];
        }
    }, [config.apiKey]);

    return { callIA, getPersonaInstruction, fetchModels, isLoading };
};
