import urllib.request
import re
import json

STOPWORDS = {
    "the", "and", "that", "for", "with", "was", "his", "her", "they", "from", "she", "not", "but", "you", "were", "had", "this", "but", "his", "her", "all", "which", "will", "what", "their", "are", "one", "there", "out", "been", "when", "who", "more", "now", "see", "can", "into", "some", "them", "then", "its", "our", "him", "has", "did", "any", "other", "about", "your", "than", "must", "only", "well", "very", "could", "upon", "down", "over", "into", "very", "made", "came", "like", "time", "went", "about", "above", "across", "after", "again", "against", "along", "among", "around", "away", "before", "behind", "below", "beside", "between", "beyond", "during", "except", "following", "from", "inside", "instead", "into", "near", "next", "onto", "outside", "over", "past", "since", "through", "throughout", "till", "toward", "towards", "under", "underneath", "unlike", "until", "upon", "within", "without",
    "don", "didn", "wasn", "couldn", "shouldn", "isn", "aren", "weren", "won", "hasn", "haven", "hadn", "can", "they", "there", "their",
    "york", "london", "paris", "chicago", "gatsby", "tom", "daisy", "jordan", "wilson", "myrtle", "nick", "baker", "wolfsheim",
    "dorian", "gray", "henry", "basil", "hallward", "sibyl", "vane", "lord",
    "frankenstein", "victor", "walton", "elizabeth", "clerval", "justine", "william", "felix",
    "jim", "hawkins", "silver", "livesey", "trelawney", "smollett", "billy", "bones", "pew", "hands", "ben", "gunn", "flint",
    "sherlock", "holmes", "watson", "lestrade", "moriarty", "hudson",
    "elizabeth", "darcy", "jane", "bingley", "bennet", "wickham", "collins", "lydia",
    "mowgli", "baloo", "bagheera", "akela", "shere", "khan", "kaa", "raksha",
    "tom", "sawyer", "huck", "finn", "becky", "thatcher", "polly", "sid", "joe", "harper",
    "dorothy", "toto", "oz", "scarecrow", "tin", "woodman", "lion", "glinda",
    "mary", "colin", "dickon", "martha", "sowerby", "craven", "medlock",
    "bobbie", "phyllis", "peter", "railway", "children",
    "gutenberg", "project", "tm", "ebook", "foundation", "works", "license", "electronic", "copy", "donations", "permission", "trademark", "paragraph", "agreement"
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
    print(f"Fetching {url}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching: {e}")
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
        ("Treasure Island", "https://www.gutenberg.org/cache/epub/120/pg120.txt"),
        ("Sherlock Holmes", "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"),
        ("Pride and Prejudice", "https://www.gutenberg.org/cache/epub/1342/pg1342.txt"),
        ("Jungle Book", "https://www.gutenberg.org/cache/epub/236/pg236.txt"),
        ("Tom Sawyer", "https://www.gutenberg.org/cache/epub/74/pg74.txt"),
        ("Wizard of Oz", "https://www.gutenberg.org/cache/epub/55/pg55.txt"),
        ("Secret Garden", "https://www.gutenberg.org/cache/epub/113/pg113.txt"),
        ("Railway Children", "https://www.gutenberg.org/cache/epub/1874/pg1874.txt")
    ]

    total_missing_freq = {}

    for name, url in books:
        text = get_book_text(url)
        if not text: continue
        vocab_freq = extract_vocab(text)
        
        for word, count in vocab_freq.items():
            if word not in existing and word not in STOPWORDS:
                total_missing_freq[word] = total_missing_freq.get(word, 0) + count

    # Filter by comprehensive frequency (at least 2 occurrences across all books or highly frequent in one)
    # This helps catch the "almost all" but avoids rare OCR/Scanning mistakes.
    significant_missing = []
    for word, count in total_missing_freq.items():
        if count >= 2:
            significant_missing.append((word, count))
    
    significant_missing.sort(key=lambda x: x[1], reverse=True)
    
    print(f"Found {len(significant_missing)} significant missing unique words.")
    
    with open("scripts/massive_missing_vocab.json", "w", encoding="utf-8") as f:
        json.dump(significant_missing, f, ensure_ascii=False, indent=4)
    
    print("Saved significant missing words to scripts/massive_missing_vocab.json")

if __name__ == "__main__":
    main()
