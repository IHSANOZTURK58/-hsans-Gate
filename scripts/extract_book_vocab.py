import urllib.request
import re
import json

STOPWORDS = {
    "the", "and", "that", "for", "with", "was", "his", "her", "they", "from", "she", "not", "but", "you", "were", "had", "this", "but", "his", "her", "all", "which", "will", "what", "their", "are", "one", "there", "out", "been", "when", "who", "more", "now", "see", "can", "into", "some", "them", "then", "its", "our", "him", "has", "did", "any", "other", "about", "your", "than", "must", "only", "well", "very", "could", "upon", "down", "over", "into", "very", "made", "came", "like", "time", "went",
    "gatsby", "tom", "daisy", "jordan", "wilson", "myrtle", "nick", "baker", "wolfsheim",
    "dorian", "gray", "henry", "basil", "hallward", "sibyl", "vane", "lord",
    "frankenstein", "victor", "walton", "elizabeth", "clerval", "justine", "william", "felix",
    "jim", "hawkins", "silver", "livesey", "trelawney", "smollett", "billy", "bones", "pew", "hands", "ben", "gunn", "flint",
    "gutenberg", "project", "tm", "ebook", "foundation", "works", "license", "electronic", "copy", "donations", "permission", "trademark", "paragraph", "agreement",
    "don", "didn", "wasn", "couldn", "shouldn", "isn", "aren", "weren", "won", "hasn", "haven", "hadn", "can", "they", "there", "their"
}

def get_existing_words():
    words = set()
    try:
        with open("js/words.js", "r", encoding="utf-8") as f:
            content = f.read()
            matches = re.findall(r'\"word\":\s*\"(.*?)\"', content)
            for m in matches:
                words.add(m.lower())
    except Exception as e:
        print(f"Error reading words.js: {e}")
    return words

def get_book_text(url):
    try:
        with urllib.request.urlopen(url) as response:
            return response.read().decode('utf-8-sig')
    except:
        return ""

def extract_vocab(text):
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    return freq

def main():
    existing = get_existing_words()
    print(f"Loaded {len(existing)} existing words.")

    books = [
        ("Gatsby", "https://www.gutenberg.org/cache/epub/64317/pg64317.txt"),
        ("Dorian Gray", "https://www.gutenberg.org/cache/epub/174/pg174.txt"),
        ("Frankenstein", "https://www.gutenberg.org/cache/epub/84/pg84.txt"),
        ("Treasure Island", "https://www.gutenberg.org/cache/epub/120/pg120.txt")
    ]

    with open("scripts/vocab_report.txt", "w", encoding="utf-8") as report:
        for name, url in books:
            print(f"Analyzing {name}...")
            text = get_book_text(url)
            vocab_freq = extract_vocab(text)
            
            missing = []
            for word, count in vocab_freq.items():
                if word not in existing and word not in STOPWORDS:
                    missing.append((word, count))
            
            missing.sort(key=lambda x: x[1], reverse=True)
            
            report.write(f"\nBOOK: {name}\n")
            report.write(f"Unique missing: {len(missing)}\n")
            top_100 = [f"{w}({c})" for w, c in missing[:100]]
            report.write("TOP 100:\n")
            report.write(", ".join(top_100) + "\n")
    
    print("Report saved to scripts/vocab_report.txt")

if __name__ == "__main__":
    main()
