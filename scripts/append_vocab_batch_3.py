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

    # Batch 3: Indices 1000-1500
    start_idx = 1000
    end_idx = 1500
    
    translations = {
        "martha": "Martha (İsim)", "sowerby": "Sowerby (İsim)", "craven": "Craven (İsim)",
        "medlock": "Medlock (İsim)", "bobbie": "Bobbie (İsim)", "phyllis": "Phyllis (İsim)",
        "peter": "Peter (İsim)", "children": "Çocuklar", "railway": "Demiryolu",
        "scarcely": "Neredeyse hiç", "immediately": "Hemen", "continued": "Devam etti",
        "replied": "Cevap verdi", "another": "Başka bir", "nothing": "Hiçbir şey",
        "looking": "Bakma", "passed": "Geçti", "seemed": "Göründü", "though": "Rağmen",
        "thought": "Düşündü", "without": "Olmadan", "against": "Karşı", "himself": "Kendisi",
        "morning": "Sabah", "nothing": "Hiçbir şey", "everything": "Her şey",
        "between": "Arasında", "through": "İçinden", "around": "Etrafında",
        "behind": "Arkasında", "before": "Önce", "after": "Sonra", "always": "Her zaman",
        "better": "Daha iyi", "little": "Küçük", "something": "Bir şey",
        "anything": "Herhangi bir şey", "others": "Diğerleri", "enough": "Yeterli",
        "almost": "Neredeyse", "already": "Zaten", "always": "Her zaman",
        "really": "Gerçekten", "quickly": "Hızlıca", "slowly": "Yavaşça",
        "finally": "Sonunda", "easily": "Kolayca", "hardly": "Zorlukla",
        "garden": "Bahçe", "secret": "Gizli", "flower": "Çiçek", "spring": "Bahar",
        "winter": "Kış", "summer": "Yaz", "autumn": "Sonbahar", "forest": "Orman",
        "morning": "Sabah", "evening": "Akşam", "night": "Gece", "midnight": "Gece yarısı",
        "scenery": "Manzara", "beauty": "Güzellik", "nature": "Doğa", "mountain": "Dağ",
        "river": "Nehir", "ocean": "Okyanus", "island": "Ada", "treasure": "Hazine",
        "gold": "Altın", "silver": "Gümüş", "bronze": "Bronz", "iron": "Demir",
        "voyage": "Yolculuk", "journey": "Yolculuk", "adventure": "Macera",
        "danger": "Tehlike", "safety": "Güvenlik", "courage": "Cesaret",
        "shadow": "Gölge", "spirit": "Ruh", "creature": "Yaratık", "monster": "Canavar",
        "horror": "Korku", "terror": "Dehşet", "misery": "Sefalet", "despair": "Umutsuzluk",
        "victory": "Zafer", "defeat": "Yenilgi", "battle": "Savaş", "enemy": "Düşman",
        "friend": "Arkadaş", "ally": "Müttefik", "betrayal": "İhanet", "loyalty": "Sadakat",
        "captain": "Kaptan", "sailor": "Denizci", "pirate": "Korsan", "mutiny": "İsyan"
    }

    new_words = []
    current_id = get_max_id() + 1
    
    for i in range(start_idx, min(end_idx, len(missing_data))):
        word, count = missing_data[i]
        lower_word = word.lower()
        meaning = translations.get(lower_word, word.capitalize())
        
        level = "B2"
        if lower_word in ["morning", "night", "flower", "garden", "winter", "summer", "always"]:
            level = "A1"
        elif lower_word in ["adventure", "journey", "treasure", "silver", "gold"]:
            level = "A2"
        elif count > 40:
            level = "B1"
        else:
            level = "B2"

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
