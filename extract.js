const fs = require('fs');

const inputFile = 'index - Copia.html';
const outputFile = 'extracted_data.json';

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');
const targetLine = lines[272]; // Line 273 is index 272

const startMarker = 'window.__INITIAL_STATE__ = ';
const endMarker = '; // SAVE_MARKER';

const startIdx = targetLine.indexOf(startMarker);
const endIdx = targetLine.lastIndexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = targetLine.substring(startIdx + startMarker.length, endIdx);
    fs.writeFileSync(outputFile, jsonStr);
    console.log('Success: Extracted JSON to ' + outputFile);
} else {
    console.log('Error: Markers not found in line 273');
}
