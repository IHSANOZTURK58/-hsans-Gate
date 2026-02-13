import json
import os
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
    # Load the missing words
    try:
        with open("scripts/massive_missing_vocab.json", "r", encoding="utf-8") as f:
            missing_data = json.load(f)
    except Exception as e:
        print(f"Error: {e}")
        return

    # Batch 2: Indices 500-999
    start_idx = 500
    end_idx = 1000
    
    translations = {
        "glinda": "Glinda (İsim)", "lion": "Aslan", "woodman": "Oduncu", "scarecrow": "Korkuluk",
        "toto": "Toto (İsim)", "becky": "Becky (İsim)", "huck": "Huck (İsim)", "finn": "Finn (İsim)",
        "akela": "Akela (İsim)", "bagheera": "Bagheera (İsim)", "baloo": "Baloo (İsim)",
        "mowgli": "Mowgli (İsim)", "lydia": "Lydia (İsim)", "collins": "Collins (İsim)",
        "wickham": "Wickham (İsim)", "bennet": "Bennet (İsim)", "bingley": "Bingley (İsim)",
        "jane": "Jane (İsim)", "darcy": "Darcy (İsim)", "elizabeth": "Elizabeth (İsim)",
        "holmes": "Holmes (İsim)", "watson": "Watson (İsim)", "lestrade": "Lestrade (İsim)",
        "moriarty": "Moriarty (İsim)", "hudson": "Hudson (İsim)", "ben": "Ben (İsim)",
        "gunn": "Gunn (İsim)", "billy": "Billy (İsim)", "bones": "Bones (İsim)",
        "trelawney": "Trelawney (İsim)", "livesey": "Livesey (İsim)", "walton": "Walton (İsim)",
        "justine": "Justine (İsim)", "clerval": "Clerval (İsim)", "henry": "Henry (İsim)",
        "basil": "Basil (İsim)", "sibyl": "Sibyl (İsim)", "vane": "Vane (İsim)",
        "daisy": "Daisy (İsim)", "jordan": "Jordan (İsim)", "myrtle": "Myrtle (İsim)",
        "baker": "Baker (İsim)", "somewhere": "Bir yer/Yerlerde", "happened": "Oldu/Gerçekleşti",
        "louisville": "Louisville", "faces": "Yüzler", "turning": "Dönme", "anyhow": "Her neyse",
        "faces": "Yüzler", "saying": "Söz", "names": "İsimler", "darkness": "Karanlık",
        "sorrow": "Keder", "thirst": "Susuzluk", "hatred": "Nefret", "keeping": "Tutma",
        "wounded": "Yaralı", "feared": "Korkulan", "dropped": "Düşmüş", "hamlet": "Mezra/Köyköy",
        "bible": "İncil", "brass": "Pirinç (Metal)", "sides": "Yanlar", "delightful": "Harika",
        "charm": "Cazibe", "romance": "Romantiklik", "theatre": "Tiyatro", "tragedy": "Trajedi",
        "horrid": "Korkunç", "stained": "Lekeli", "shoulders": "Omuzlar", "sigh": "İç çekiş",
        "genius": "Deha", "morrow": "Yarın", "worship": "Tapınma", "foolish": "Aptalca",
        "lit": "Aydınlatılmış", "faces": "Yüzler", "infinite": "Sonsuz", "sorrow": "Keder",
        "met": "Tanıştı", "states": "Eyaletler", "chicago": "Chicago", "trying": "Deneme",
        "sitting": "Oturma", "standing": "Ayakta durma", "nodded": "Başını salladı",
        "insisted": "Israr etti", "anyhow": "Her nasılsa", "taking": "Alma", "turning": "Dönüş",
        "raised": "Kaldırılmış/Yetişmiş", "jay": "Jay", "coloured": "Renkli", "coming": "Gelme",
        "rang": "Çaldı", "talking": "Konuşma", "wants": "İstekler", "murmur": "Mırıltı",
        "eagerly": "Hevesle", "holding": "Tutma", "somewhere": "Bir yerlerde",
        "shook": "Salladı", "looked": "Baktı", "thought": "Düşündü", "nothing": "Hiçbir şey",
        "something": "Bir şey", "everything": "Her şey", "anything": "Herhangi bir şey",
        "himself": "Kendisi", "herself": "Kendisi", "themselves": "Kendileri",
        "ourselves": "Kendimiz", "yourselves": "Kendiniz", "myself": "Kendim"
    }

    new_words = []
    current_id = get_max_id() + 1
    
    for i in range(start_idx, min(end_idx, len(missing_data))):
        word, count = missing_data[i]
        lower_word = word.lower()
        meaning = translations.get(lower_word, word.capitalize())
        
        level = "B2"
        if lower_word in ["looked", "thought", "nothing", "something", "shook", "faces"]:
            level = "A2"
        elif count > 40:
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
