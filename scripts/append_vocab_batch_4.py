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

    # Batch 4: Indices 1500-2000
    start_idx = 1500
    end_idx = 2000
    
    translations = {
        "mowgli": "Mowgli", "shere": "Shere", "shere": "Shere", "khan": "Han/Kağan",
        "bagheera": "Bagheera", "baloo": "Baloo", "akela": "Akela",
        "scarcely": "Neredeyse hiç", "replied": "Yanıtladı", "replied": "Yanıtladı",
        "replied": "Yanıtladı", "continued": "Devam etti", "immediately": "Hemen",
        "beautifully": "Güzelce", "wonderfully": "Harika şekilde", "suddenly": "Aniden",
        "perfectly": "Kusursuzca", "entirely": "Tamamen", "completely": "Tamamen",
        "certainly": "Kesinlikle", "extremely": "Aşırı derecede", "scarcely": "Anca",
        "possibly": "Muhtemelen", "probably": "Muhtemelen", "usually": "Genellikle",
        "officer": "Subay/Memur", "soldier": "Asker", "palace": "Saray",
        "castle": "Kale", "village": "Köy", "countryside": "Kırsal",
        "landscape": "Manzara", "environment": "Çevre", "atmosphere": "Atmosfer",
        "weather": "Hava durumu", "thunder": "Gök gürültüsü", "lightning": "Şimşek",
        "shadows": "Gölgeler", "silence": "Sessizlik", "whisper": "Fısıltı",
        "shout": "Bağırmak", "scream": "Çığlık", "laughter": "Kahkaha",
        "happiness": "Mutluluk", "sadness": "Üzüntü", "anger": "Öfke",
        "fear": "Korku", "hope": "Umut", "dream": "Rüya/Hayal",
        "purpose": "Amaç", "reason": "Sebep", "result": "Sonuç",
        "evidence": "Kanıt", "mystery": "Gizem", "secret": "Sır",
        "knowledge": "Bilgi", "wisdom": "Bilgelik", "truth": "Gerçek",
        "heart": "Kalp", "soul": "Ruh", "mind": "Zihin",
        "strength": "Güç", "weakness": "Zayıflık", "health": "Sağlık",
        "disease": "Hastalık", "death": "Ölüm", "life": "Hayat",
        "beginning": "Başlangıç", "middle": "Orta", "conclusion": "Sonuç",
        "success": "Başarı", "failure": "Başarısızlık", "wealth": "Zenginlik",
        "poverty": "Fakirlik", "freedom": "Özgürlük", "justice": "Adalet",
        "peace": "Barış", "war": "Savaş", "humanity": "İnsanlık",
        "nature": "Doğa", "universe": "Evren", "world": "Dünya",
        "morning": "Sabah", "afternoon": "Öğleden sonra", "evening": "Akşam",
        "night": "Gece", "today": "Bugün", "tomorrow": "Yarın"
    }

    new_words = []
    current_id = get_max_id() + 1
    
    for i in range(start_idx, min(end_idx, len(missing_data))):
        word, count = missing_data[i]
        lower_word = word.lower()
        meaning = translations.get(lower_word, word.capitalize())
        
        level = "B2"
        if lower_word in ["morning", "night", "today", "tomorrow", "heart", "world", "hope"]:
            level = "A1"
        elif count > 30:
            level = "B1"
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
