
const fs = require('fs');
const path = require('path');

const wordsFile = path.join(__dirname, 'js', 'words.js');

try {
    let content = fs.readFileSync(wordsFile, 'utf8');
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');

    if (start === -1) throw new Error("Format error");

    let arrayContent = content.substring(start, end + 1);
    const window = {};
    eval('window.WORD_DATA = ' + arrayContent);
    const data = window.WORD_DATA;

    let a2Indices = [];
    let b2Indices = [];

    data.forEach((w, index) => {
        if (w.level === 'A2') a2Indices.push(index);
        if (w.level === 'B2') b2Indices.push(index);
    });

    // Shuffle helper
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    a2Indices = shuffle(a2Indices);
    b2Indices = shuffle(b2Indices);

    // Move 300 A2 -> A1
    const toA1 = a2Indices.slice(0, 300);
    toA1.forEach(idx => data[idx].level = 'A1');

    // Move 50 B2 -> C1 (Total C1 was 9, now 59)
    const toC1 = b2Indices.slice(0, 50);
    toC1.forEach(idx => data[idx].level = 'C1');

    // Move 30 B2 -> C2
    const toC2 = b2Indices.slice(50, 80);
    toC2.forEach(idx => data[idx].level = 'C2');

    // Format output
    // Clean JSON format but keeping the variable assignment
    const newContent = 'window.WORD_DATA = ' + JSON.stringify(data, null, 4) + ';';

    fs.writeFileSync(wordsFile, newContent, 'utf8');
    console.log("Rebalanced levels successfully.");

    // Verify
    const counts = {};
    data.forEach(w => {
        counts[w.level] = (counts[w.level] || 0) + 1;
    });
    console.log("New Counts:", counts);

} catch (e) {
    console.error("Error:", e);
}
