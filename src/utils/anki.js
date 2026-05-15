export const syncFlashcardsToAnki = async (flashcards) => {
    if (!flashcards || flashcards.length === 0) return { success: false, error: "Nenhum flashcard para sincronizar." };

    try {
        // Group by deck
        const grouped = flashcards.reduce((acc, card) => {
            const deck = card.deckName || 'Caderno_IA_Default';
            if (!acc[deck]) acc[deck] = [];
            acc[deck].push(card);
            return acc;
        }, {});

        for (const deckName of Object.keys(grouped)) {
            // 1. Create Deck
            await invokeAnki('createDeck', { deck: deckName });

            // 2. Add Notes
            const notes = grouped[deckName].map(c => ({
                deckName: deckName,
                modelName: "Basic",
                fields: {
                    Front: c.front,
                    Back: c.back
                },
                tags: ["caderno_ia"]
            }));

            await invokeAnki('addNotes', { notes });
        }

        return { success: true };
    } catch (err) {
        console.error("Anki Sync Error:", err);
        return { success: false, error: "Certifique-se que o Anki está aberto e o AnkiConnect está instalado." };
    }
};

const invokeAnki = (action, params = {}) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => reject('failed to issue request'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (Object.getOwnPropertyNames(response).length !== 2) {
                    throw 'response has an unexpected number of fields';
                }
                if (!response.hasOwnProperty('error')) {
                    throw 'response is missing required error field';
                }
                if (!response.hasOwnProperty('result')) {
                    throw 'response is missing required result field';
                }
                if (response.error) {
                    throw response.error;
                }
                resolve(response.result);
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        xhr.send(JSON.stringify({ action, version: 6, params }));
    });
};
