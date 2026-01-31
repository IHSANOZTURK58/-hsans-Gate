
const fs = require('fs');
const path = require('path');

const wordsFile = path.join(__dirname, 'js', 'words.js');

try {
    let content = fs.readFileSync(wordsFile, 'utf8');
    // Simple parsing: extract JSON-like array
    // We can't simple require it because it has 'window.WORD_DATA ='

    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');

    if (start === -1 || end === -1) {
        console.error("Could not find array brackets.");
        process.exit(1);
    }

    let arrayContent = content.substring(start, end + 1);

    // Fix loose JS to valid JSON for parsing if possible, or just eval
    // Eval is risky but easiest for valid JS file analysis in this restricted env
    // creating a dummy window object
    const window = {};
    eval('window.WORD_DATA = ' + arrayContent);
    const data = window.WORD_DATA;

    console.log(`Total Words: ${data.length}`);

    const missingLevel = data.filter(w => !w.level);
    console.log(`Words missing level: ${missingLevel.length}`);

    if (missingLevel.length > 0) {
        console.log("First 5 missing level:", missingLevel.slice(0, 5));
    }

    // Count by level
    const counts = {};
    data.forEach(w => {
        if (w.level) {
            counts[w.level] = (counts[w.level] || 0) + 1;
        }
    });
    console.log("Counts by Level:", counts);

} catch (e) {
    console.error("Error:", e.message);
}
