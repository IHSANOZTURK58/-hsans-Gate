import json
import re

def get_max_id():
    max_id = 0
    with open("js/words.js", "r", encoding="utf-8") as f:
        for line in f:
            match = re.search(r'\"id\":\s*(\d+)', line)
            if match:
                val = int(match.group(1))
                if val > max_id:
                    max_id = val
    return max_id

def append_words():
    try:
        with open("scripts/massive_missing_vocab.json", "r", encoding="utf-8") as f:
            missing_data = json.load(f)
    except Exception as e:
        print(f"Error: {e}")
        return

    # Batch 8: Indices 5000-6000 (1000 words)
    start_idx = 5000
    end_idx = 6000
    
    new_words = []
    current_id = get_max_id() + 1
    
    for i in range(start_idx, min(end_idx, len(missing_data))):
        word, count = missing_data[i]
        
        meaning = word.capitalize() 
        level = "B2"
        if count > 10: level = "B1"
        elif count < 3: level = "C2"
        else: level = "C1"

        new_words.append({
            "id": current_id,
            "word": word.capitalize(),
            "meaning": meaning,
            "level": level
        })
        current_id += 1

    new_entries = [f"    {json.dumps(w, ensure_ascii=False)}" for w in new_words]
    content_to_insert = ",\n".join(new_entries)
    
    with open("js/words.js", "r", encoding="utf-8") as f:
        file_content = f.read().strip()
    
    if file_content.endswith("];"):
        core = file_content[:-2].strip()
        if not core.endswith(","):
            core += ","
        final_content = core + "\n" + content_to_insert + "\n];"
        with open("js/words.js", "w", encoding="utf-8") as f:
            f.write(final_content)
        print(f"Successfully added {len(new_words)} words. New max ID: {current_id - 1}")
    else:
        print("Error: Could not find end of array in words.js")

if __name__ == "__main__":
    append_words()
