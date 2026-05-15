const fs = require('fs');
const lines = fs.readFileSync('c:/Users/gabri/OneDrive/Documentos/Caderno/index.html', 'utf8').split('\n');
lines.forEach((line, index) => {
    if (line.includes('elaboradorState') || line.includes('Elaborador')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
