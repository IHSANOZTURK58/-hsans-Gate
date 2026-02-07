const fs = require('fs');
const path = require('path');

// Mock window
global.window = {};

const wordsPath = path.join(__dirname, '../js/words.js');

// Load words
try {
    const content = fs.readFileSync(wordsPath, 'utf8');
    eval(content);
} catch (e) {
    console.error("Dosya okuma hatası:", e);
    process.exit(1);
}

const allWords = window.WORD_DATA;
console.log(`Toplam kelime sayısı (İşlem öncesi): ${allWords.length}`);

// Deduplicate
const uniqueMap = new Map();
const duplicates = [];

allWords.forEach(item => {
    // Normalize word key: lowercase and trimmed
    const key = item.word.trim().toLowerCase();

    if (uniqueMap.has(key)) {
        duplicates.push(item.word);
        // Optional: Merge levels or meanings if needed? 
        // For now, keep the first one (usually the original manual entry is better than batch import if conflicting)
    } else {
        uniqueMap.set(key, item);
    }
});

const cleanedWords = Array.from(uniqueMap.values());
// Sort cleanly by ID or Word? 
// Original list was mixed. Let's keep it somewhat ordered but maybe just strictly valid is enough.
// Let's sort alphabetically to make future diffs easier? Or by ID?
// Many new words don't have IDs.
// Let's just keep them as searched/mapped.

console.log(`Tekrar eden kelimeler: ${duplicates.length}`);
if (duplicates.length > 0) {
    console.log("Örnekler:", duplicates.slice(0, 5).join(', '));
}

console.log(`Temizlenmiş kelime sayısı: ${cleanedWords.length}`);

// Write back
const newContent = `window.WORD_DATA = ${JSON.stringify(cleanedWords, null, 4)};`;
fs.writeFileSync(wordsPath, newContent);
console.log('js/words.js başarıyla güncellendi.');
