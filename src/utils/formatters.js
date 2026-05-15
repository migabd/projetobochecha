/**
 * Utilitários de formatação de dados.
 */

/**
 * Formata segundos em string MM:SS.
 * @param {number} seconds 
 * @returns {string}
 */
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formata data local para exibição.
 * @param {Date|number|string} date 
 * @returns {string}
 */
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Gera um ID único baseado em timestamp e randômico.
 * @returns {string}
 */
export const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
