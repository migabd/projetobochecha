const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const outputPath = path.join(__dirname, 'restored_db.json');

console.log('Lendo arquivo: ' + filePath);

try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const startMarker = 'window.__INITIAL_STATE__ = ';
    const endMarker = '}; // SAVE_MARKER';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker, startIndex);
    
    if (startIndex !== -1 && endIndex !== -1) {
        const jsonString = content.substring(startIndex + startMarker.length, endIndex + 1);
        fs.writeFileSync(outputPath, jsonString);
        console.log('Sucesso! O banco de dados foi extraído para: ' + outputPath);
        
        // Validar JSON
        try {
            const parsed = JSON.parse(jsonString);
            console.log('Validação: JSON OK');
            console.log('Total de erros: ' + (parsed.errors ? parsed.errors.length : 0));
            console.log('Total de flashcards: ' + (parsed.flashcards ? parsed.flashcards.length : 0));
        } catch (e) {
            console.error('Erro ao validar JSON: ' + e.message);
        }
    } else {
        console.error('Marcadores não encontrados no arquivo.');
    }
} catch (err) {
    console.error('Erro ao ler arquivo: ' + err.message);
}
