const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

const targets = ['view-reading', 'reading-library', 'reading-reader', 'dictionary-search', 'dict-toast'];

targets.forEach(target => {
    const lineNum = lines.findIndex(line => line.includes(target));
    if (lineNum !== -1) {
        console.log(`\nFound ${target} at line ${lineNum + 1}`);
        console.log(`Context:`);
        for (let i = Math.max(0, lineNum - 2); i <= Math.min(lines.length - 1, lineNum + 2); i++) {
            console.log(`${i + 1}: ${lines[i].trim()}`);
        }
    } else {
        console.log(`\nNOT FOUND: ${target}`);
    }
});
