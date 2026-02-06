const fs = require('fs');
const path = require('path');

// Mock window
global.window = {};

const wordsPath = path.join(__dirname, '../js/words.js');
const batches = ['batch1.js', 'batch2.js', 'batch3.js', 'batch4.js'];

// Load existing
const existingContent = fs.readFileSync(wordsPath, 'utf8');
eval(existingContent);
const originalLength = window.WORD_DATA.length;
console.log(`Original dictionary size: ${originalLength}`);

let newWordsCount = 0;

// Load and append batches
batches.forEach(batchFile => {
    const batchPath = path.join(__dirname, batchFile);
    if (fs.existsSync(batchPath)) {
        const batchContent = fs.readFileSync(batchPath, 'utf8');
        eval(batchContent);

        // Determine batch name from file index or specific variable if I named them differently?
        // In my write_to_file calls I named them window.BATCH_1, window.BATCH_2, etc.
        // Let's infer the variable name.
        const batchNum = batchFile.match(/\d+/)[0];
        const batchVar = `BATCH_${batchNum}`;
        const newWords = window[batchVar];

        if (newWords && Array.isArray(newWords)) {
            window.WORD_DATA = window.WORD_DATA.concat(newWords);
            newWordsCount += newWords.length;
            console.log(`Added ${newWords.length} words from ${batchFile}`);
        }
    }
});

console.log(`New dictionary size: ${window.WORD_DATA.length}`);
console.log(`Total added: ${newWordsCount}`);

// Write back
const newContent = `window.WORD_DATA = ${JSON.stringify(window.WORD_DATA, null, 4)};`;
fs.writeFileSync(wordsPath, newContent);
console.log('Successfully updated js/words.js');
