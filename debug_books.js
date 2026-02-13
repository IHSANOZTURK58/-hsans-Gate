
// Mock window
window = {};

// Load books.js
const fs = require('fs');
const bookContent = fs.readFileSync('./js/books.js', 'utf8');
eval(bookContent);

// Check data
console.log("Loaded Levels:");
Object.keys(window.BOOK_DATA).forEach(level => {
    const books = window.BOOK_DATA[level];
    console.log(`${level}: ${books.length} books`);
    books.forEach(b => console.log(`  - ${b.title}`));
});
