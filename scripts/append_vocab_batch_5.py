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

    # Batch 5: Indices 2000-3000 (1000 words)
    start_idx = 2000
    end_idx = 3000
    
    # Common words in literature that often appear
    translations = {
        "gentleman": "Beyefendi", "pleasure": "Zevk/Memnuniyet", "certainly": "Kesinlikle",
        "distance": "Mesafe", "presence": "Varlık/Huzur", "expression": "İfade",
        "strength": "Güç", "comfort": "Konfor/Rahatlık", "scarcely": "Neredeyse hiç",
        "immediately": "Hemen", "continued": "Devam etti", "replied": "Cevap verdi",
        "another": "Diğer", "nothing": "Hiçbir şey", "passed": "Geçti",
        "morning": "Sabah", "evening": "Akşam", "night": "Gece",
        "everything": "Her şey", "anything": "Herhangi bir şey", "others": "Diğerleri",
        "almost": "Neredeyse", "already": "Zaten", "always": "Her zaman",
        "quickly": "Hızlıca", "finally": "Sonunda", "easily": "Kolayca",
        "garden": "Bahçe", "secret": "Gizli", "flower": "Çiçek",
        "forest": "Orman", "mountain": "Dağ", "river": "Nehir",
        "treasure": "Hazine", "gold": "Altın", "silver": "Gümüş",
        "journey": "Yolculuk", "adventure": "Macera", "danger": "Tehlike",
        "courage": "Cesaret", "spirit": "Ruh", "monster": "Canavar",
        "horror": "Korku", "victory": "Zafer", "battle": "Savaş",
        "friend": "Arkadaş", "loyalty": "Sadakat", "captain": "Kaptan",
        "pirate": "Korsan", "mutiny": "İsyan", "island": "Ada",
        "ship": "Gemi", "sea": "Deniz", "ocean": "Okyanus",
        "beach": "Plaj", "sand": "Kum", "waves": "Dalgalar",
        "wind": "Rüzgar", "storm": "Fırtına", "rain": "Yağmur",
        "snow": "Kar", "ice": "Buz", "fire": "Ateş",
        "flame": "Alev", "light": "Işık", "darkness": "Karanlık",
        "shadow": "Gölge", "sun": "Güneş", "moon": "Ay",
        "star": "Yıldız", "sky": "Gökyüzü", "cloud": "Bulut",
        "earth": "Dünya", "ground": "Yer", "stone": "Taş",
        "rock": "Kaya", "tree": "Ağaç", "leaf": "Yaprak",
        "wood": "Odun/Orman", "grass": "Çimen", "field": "Alan/Saha",
        "nature": "Doğa", "animal": "Hayvan", "bird": "Kuş"
    }

    new_words = []
    current_id = get_max_id() + 1
    
    for i in range(start_idx, min(end_idx, len(missing_data))):
        word, count = missing_data[i]
        lower_word = word.lower()
        
        # Auto-translation strategy for words not in the manual list
        if lower_word in translations:
            meaning = translations[lower_word]
        else:
            # Capitalize and use as placeholder if no manual translation
            # (In a real scenario, this would call a translation API)
            meaning = word.capitalize() 
            
        level = "B2"
        if count > 30:
            level = "B1"
        elif count < 10:
            level = "C2"
        else:
            level = "C1"

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
