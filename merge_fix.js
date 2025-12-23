const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/pc/.gemini/antigravity/playground/inner-pulsar/js';
const files = [
    'words_part1.js',
    'words_part2.js',
    'words_part3.js',
    'words_part4.js',
    'words_part5.js'
];

let allWords = [];

try {
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8').trim();

            // Remove assignment if exists
            if (content.includes('=')) {
                content = content.substring(content.indexOf('=') + 1).trim();
            }

            // Remove trailing semicolon
            if (content.endsWith(';')) {
                content = content.slice(0, -1).trim();
            }

            // Remove outer brackets [ ]
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']');

            if (start !== -1 && end !== -1) {
                let inner = content.substring(start + 1, end).trim();
                // If it ends with a comma, remove it
                if (inner.endsWith(',')) inner = inner.slice(0, -1);
                // Simple parsing isn't enough if there are commas in strings, but our data is clean keys
                // Better: we can try to JSON.parse it? No, because keys aren't quoted.
                // We will just concatenate the inner contents.
                allWords.push(inner);
            }
        }
    });

    const finalContent = `window.WORD_DATA = [\n${allWords.join(',\n')}\n];`;
    fs.writeFileSync(path.join(dir, 'words.js'), finalContent);
    console.log("Merge Success: Created words.js with " + files.length + " parts.");
} catch (e) {
    console.error("Merge Failed:", e);
    process.exit(1);
}
