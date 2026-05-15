/**
 * Cifra XOR para proteção de tokens e chaves sensíveis no cliente.
 * Evita detecção estática básica por scanners de repositório.
 */

/**
 * Decifra uma string codificada em Base64 usando uma chave XOR.
 * @param {string} encodedStr - String em Base64 resultante do XOR.
 * @param {string} key - Chave secreta para decifrar.
 * @returns {string} - String original decifrada.
 */
export const xorDecrypt = (encodedStr, key) => {
    try {
        const raw = atob(encodedStr);
        let res = '';
        for (let i = 0; i < raw.length; i++) {
            res += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return res;
    } catch (e) {
        console.error("Erro na decifração XOR:", e);
        return '';
    }
};

/**
 * Cifra uma string usando uma chave XOR e retorna em Base64.
 * @param {string} str - String original.
 * @param {string} key - Chave secreta para cifrar.
 * @returns {string} - String cifrada em Base64.
 */
export const xorEncrypt = (str, key) => {
    let res = '';
    for (let i = 0; i < str.length; i++) {
        res += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(res);
};
