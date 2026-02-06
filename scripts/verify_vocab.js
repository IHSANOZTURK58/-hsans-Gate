const fs = require('fs');
const path = require('path');

// Mock window object
global.window = {};

// Paths
const booksPath = path.join(__dirname, '../js/books.js');
const wordsPath = path.join(__dirname, '../js/words.js');

// Load files
// We use eval to execute the file content in this context, populating window.BOOK_DATA and window.WORD_DATA
try {
    const booksContent = fs.readFileSync(booksPath, 'utf8');
    const wordsContent = fs.readFileSync(wordsPath, 'utf8');

    eval(booksContent);
    eval(wordsContent);
} catch (err) {
    console.error("Error reading or evaluating files:", err);
    process.exit(1);
}

const bookData = window.BOOK_DATA;
const wordData = window.WORD_DATA; // Array of objects {word, meaning, level}

console.log(`Loaded ${wordData.length} existing words.`);

// 1. Extract words from books
const bookWords = new Set();
const breakdown = {};

function extractWords(text) {
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, ' ');
    // Match words (letters, hyphens, apostrophes)
    const matches = cleanText.match(/\b[a-zA-Z]+(?:[''-][a-zA-Z]+)*\b/g);
    return matches ? matches.map(w => w.toLowerCase()) : [];
}

Object.keys(bookData).forEach(level => {
    const book = bookData[level];
    if (book.pages) {
        book.pages.forEach(page => {
            const words = extractWords(page);
            words.forEach(w => bookWords.add(w));
        });
    }
});

console.log(`Found ${bookWords.size} unique words in books.`);

// 2. Build dictionary lookup
const dictionaryWords = new Set(wordData.map(item => item.word.toLowerCase()));

// 3. Find missing words
const missingWords = [];
const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'yes', 'he', 'she', 'it', 'they', 'we', 'i', 'you', 'my', 'your', 'his', 'her', 'its', 'their', 'our', 'him', 'them', 'me', 'us', 'that', 'this', 'these', 'those', 'who', 'what', 'where', 'why', 'how', 'which']);

bookWords.forEach(word => {
    if (!dictionaryWords.has(word) && !stopwords.has(word)) {
        // Simple filter for proper nouns or distinct typos could be added here
        // For now, list everything
        if (word.length > 2) { // Ignore 1-2 letter noise unless common
            missingWords.push(word);
        }
    }
});

missingWords.sort();

const outputPath = path.join(__dirname, 'missing_words.json');
fs.writeFileSync(outputPath, JSON.stringify(missingWords, null, 2));
console.log(`Saved ${missingWords.length} missing words to scripts/missing_words.json`);
