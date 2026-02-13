import json
import time
import urllib.request
import urllib.error

# API Keys from app.js
API_KEYS = [
    "AIzaSyAjIAR8yjA0kTPN23qxy0ovel-REpoH5Zc",
    "AIzaSyCKb-Cm2rnVlkA-WfkxjU5E_YHGrPqKObw",
    "AIzaSyCMQoab17MmEEBgSHqEeabHr_aNnyyfC48",
    "AIzaSyCKBMvmoImAWiVSgMfPpYlTYOQJrF1clEo"
]

import sys

# ... (API Keys) ...

INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else "fix_vocab.json"
OUTPUT_FILE = sys.argv[2] if len(sys.argv) > 2 else "fixed_vocab.json"
BATCH_SIZE = 50

def translate_batch(words, key_index):
    word_list = [w['word'] for w in words]
    
    prompt = f"""
    Translate the following English words to Turkish.
    Return ONLY a valid JSON object where keys are English words and values are Turkish meanings.
    Do not include any explanations or markdown formatting.
    Words: {json.dumps(word_list)}
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    api_key = API_KEYS[key_index]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Referer': 'https://ihsansgate.firebaseapp.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
        if 'candidates' in result and result['candidates']:
            text = result['candidates'][0]['content']['parts'][0]['text']
            # Clean up markdown code blocks if present
            text = text.replace('```json', '').replace('```', '').strip()
            return json.loads(text)
            
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"Quota exceeded for key {key_index}. Rotating...")
            raise Exception("QuotaExceeded")
        else:
            print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")
        
    return None

def main():
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            all_issues = json.load(f)
    except FileNotFoundError:
        print(f"File {INPUT_FILE} not found. Run find_bad_translations.py first.")
        return

    print(f"Loaded {len(all_issues)} words to translate.")
    
    fixed_words = []
    current_key_index = 0
    
    # Process in batches
    for i in range(0, len(all_issues), BATCH_SIZE):
        batch = all_issues[i:i+BATCH_SIZE]
        print(f"Processing batch {i//BATCH_SIZE + 1} ({len(batch)} words)...")
        
        success = False
        while not success:
            try:
                translations = translate_batch(batch, current_key_index)
                if translations:
                    for item in batch:
                        word = item['word']
                        # Handle case differences
                        trans = translations.get(word) or translations.get(word.lower()) or translations.get(word.capitalize())
                        
                        if trans:
                            item['meaning'] = trans
                        else:
                            print(f"Warning: No translation found for '{word}'")
                        
                        fixed_words.append(item)
                    success = True
                    # Small delay to be nice to API
                    time.sleep(1)
                else:
                    print("Batch failed (empty response), retrying with next key...")
                    current_key_index = (current_key_index + 1) % len(API_KEYS)
                    time.sleep(2)
                    
            except Exception as e:
                if "QuotaExceeded" in str(e):
                    current_key_index = (current_key_index + 1) % len(API_KEYS)
                    print(f"Switched to key {current_key_index}")
                else:
                    print(f"Unexpected error: {e}. Skipping batch.")
                    success = True # Skip to avoid infinite loop
        
        # Periodic save
        if i % (BATCH_SIZE * 5) == 0:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(fixed_words, f, ensure_ascii=False, indent=4)
            print(f"Progress saved ({len(fixed_words)} words).")

    # Final save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(fixed_words, f, ensure_ascii=False, indent=4)
        
    print(f"Completed! Fixed {len(fixed_words)} words. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
