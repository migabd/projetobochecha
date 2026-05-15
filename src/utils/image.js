/**
 * Utilitários para processamento e compressão de imagens.
 */

/**
 * Comprime uma imagem Base64 reduzindo sua qualidade e dimensões se necessário.
 * @param {string} base64 - Imagem original em Base64.
 * @param {number} quality - Qualidade da compressão (0 a 1).
 * @param {number} maxWidth - Largura máxima permitida.
 * @returns {Promise<string>} - Promessa que resolve para a imagem comprimida em Base64.
 */
export const compressImage = (base64, quality = 0.7, maxWidth = 1200) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

/**
 * Converte um arquivo para Base64.
 * @param {File} file - Arquivo de imagem.
 * @returns {Promise<string>}
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};
