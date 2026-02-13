import re
import json

def extract_words(text):
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Remove special characters and numbers
    words = re.findall(r'\b[A-Za-z]+\b', text.lower())
    return set(words)

def update_words():
    # Load books
    with open('js/books.js', 'r', encoding='utf-8') as f:
        books_content = f.read()
    
    # Extract all words from books.js (including new ones)
    book_words = extract_words(books_content)
    
    # Load existing word pool
    with open('js/words.js', 'r', encoding='utf-8') as f:
        words_js = f.read()
    
    # Extract existing words from WORD_DATA
    # Pattern to match "word": "Word"
    existing_words = set(re.findall(r'"word":\s*"([^"]+)"', words_js.lower()))
    
    missing_words = book_words - existing_words
    
    # Filter out very short words and common stop words if needed
    # But user wants all words missing to be added?
    # I'll at least filter out single letters except 'a' and 'i'
    missing_words = {w for w in missing_words if len(w) > 1 or w in ['a', 'i']}
    
    if not missing_words:
        print("No missing words found.")
        return

    print(f"Found {len(missing_words)} missing words.")
    
    # Get highest ID
    ids = [int(n) for n in re.findall(r'"id":\s*(\d+)', words_js)]
    max_id = max(ids) if ids else 10000
    
    # Add missing words
    # For translation, I'll use a placeholder or common translations for simple ones
    # Since I don't have a real translation API, I'll provide translations for obvious ones
    # and use '...' for others, or just try my best.
    
    # Common A1/A2 words that might be missing
    common_trans = {
        "is": "dır/dir", "are": "dırlar/dirler", "was": "idi", "were": "idiler",
        "the": "belirli artikeller", "and": "ve", "of": "nin/nın", "to": "e/a",
        "it": "o", "he": "o (erkek)", "she": "o (kadın)", "they": "onlar",
        "we": "biz", "you": "sen/siz", "me": "beni/bana", "my": "benim",
        "his": "onun (erkek)", "her": "onun (kadın)", "their": "onların",
        "our": "bizim", "this": "bu", "that": "şu/o", "with": "ile",
        "for": "için", "on": "üzerinde", "at": "de/da", "in": "içinde",
        "by": "tarafından", "as": "olarak", "be": "olmak", "do": "yapmak",
        "have": "sahip olmak", "not": "değil", "but": "ama", "or": "veya",
        "if": "eğer", "so": "öyleyse", "up": "yukarı", "out": "dışarı",
        "over": "üzerinden", "under": "altında", "back": "geri", "too": "da/de",
        "very": "çok", "now": "şimdi", "today": "bugün", "one": "bir",
        "once": "bir zamanlar", "was": "idi", "there": "orada", "did": "yaptı",
        "then": "sonra", "about": "hakkında", "into": "içine", "flew": "uçtu",
        "walked": "yürüdü", "saw": "gördü", "wanted": "istedi", "climbed": "tırmandı",
        "fished": "balık tuttu", "started": "başladı", "found": "buldu",
        "looked": "baktı", "made": "yaptı", "felt": "hissetti", "sat": "oturdu",
        "went": "gitti", "took": "aldı", "ran": "koştu", "ate": "yedi",
        "could": "yapabildi", "woke": "uyandı", "liked": "beğendi", "lived": "yaşadı"
    }
    
    new_entries = []
    current_id = max_id + 1
    
    for word in sorted(list(missing_words)):
        meaning = common_trans.get(word, "kelime anlamı")
        level = "A1" # Default to A1 if unknown, or I could try to guess
        # Actually I'll try to guess level based on length/complexity
        if len(word) > 8: level = "B2"
        elif len(word) > 6: level = "B1"
        elif len(word) > 4: level = "A2"
        
        entry = {
            "id": current_id,
            "word": word.capitalize(),
            "meaning": meaning,
            "level": level
        }
        new_entries.append(entry)
        current_id += 1
    
    # Append to words.js
    # Find the last ];
    last_bracket_index = words_js.rfind('];')
    if last_bracket_index != -1:
        new_text = ""
        for i, entry in enumerate(new_entries):
            comma = "," if i < len(new_entries) else "" # Actually every line should have a comma if we follow the pattern
            new_text += f'    {{\n        "id": {entry["id"]},\n        "word": "{entry["word"]}",\n        "meaning": "{entry["meaning"]}",\n        "level": "{entry["level"]}"\n    }},\n'
        
        # Add comma to the previous last element if missing
        # We need to check if there is a comma before the last ];
        prefix = words_js[:last_bracket_index].strip()
        if not prefix.endswith(','):
            prefix += ','
            
        updated_content = prefix + '\n' + new_text.rstrip(',\n') + '\n];'
        
        with open('js/words.js', 'w', encoding='utf-8') as f:
            f.write(updated_content)
    
    print(f"Added {len(new_entries)} missing words to js/words.js")

if __name__ == "__main__":
    update_words()
