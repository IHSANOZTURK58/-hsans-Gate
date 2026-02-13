// 1. Bu kodu kopyala
// 2. Oyunu açtığın tarayıcıda F12'ye basıp Console sekmesine gel
// 3. Kodu yapıştır ve Enter'a bas

async function fixVocabularyInConsole() {
    console.clear();
    console.log("🚀 Çeviri işlemi başlatılıyor...");

    // 1. Hatalı kelimeleri bul (Anlamı kendisiyle aynı olanlar)
    // Sadece son eklenenlere bakıyoruz (ID > 20000 varsayımı veya sondan)
    // Güvenlik için tüm listeyi tarayalım

    if (!window.WORD_DATA) {
        console.error("❌ WORD_DATA bulunamadı! Lütfen oyunun yüklendiğinden emin ol.");
        return;
    }

    const badWords = window.WORD_DATA.filter(w =>
        w.meaning && w.word &&
        w.meaning.trim().toLowerCase() === w.word.trim().toLowerCase()
    );

    console.log(`⚠️ Toplam ${badWords.length} hatalı kelime bulundu.`);

    if (badWords.length === 0) {
        console.log("✅ Düzeltilecek kelime yok! Harika.");
        return;
    }

    // 2. İlk 1000 tanesini al (Kullanıcının isteği üzerine parça parça)
    const BATCH_LIMIT = 1000;
    const batch = badWords.slice(0, BATCH_LIMIT);
    console.log(`🛠️ Şu an ilk ${batch.length} kelime düzeltilecek...`);

    // API Keys (App'ten al)
    const apiKeys = app.geminiService.apiKeys;
    let keyIndex = 0;

    // Helper: Delay
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // Batch Translation Logic
    const fixedItems = [];
    const CHUNK_SIZE = 40; // Tek seferde API'ye sorulan kelime sayısı

    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        const chunk = batch.slice(i, i + CHUNK_SIZE);
        const wordsToAsk = chunk.map(c => c.word);

        console.log(`📡 Parça işleniyor: ${i} - ${i + chunk.length} / ${batch.length}`);

        // Prompt
        const prompt = `
        Translate these English words to Turkish.
        Return strictly a JSON object: {"EnglishWord": "TurkishMeaning"}.
        No extra text.
        Words: ${JSON.stringify(wordsToAsk)}
        `;

        let success = false;
        let retry = 0;

        while (!success && retry < 3) {
            try {
                const key = apiKeys[keyIndex];
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (response.ok) {
                    const data = await response.json();
                    let text = data.candidates[0].content.parts[0].text;
                    // Clean MD
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const jsonStart = text.indexOf('{');
                    const jsonEnd = text.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        text = text.substring(jsonStart, jsonEnd + 1);
                        const translations = JSON.parse(text);

                        // Apply translations
                        chunk.forEach(item => {
                            // Case insensitve lookup
                            const tr = translations[item.word] ||
                                translations[item.word.toLowerCase()] ||
                                translations[item.word.charAt(0).toUpperCase() + item.word.slice(1)];

                            if (tr) {
                                fixedItems.push({ ...item, meaning: tr });
                            } else {
                                // Keep original if failed
                                console.warn(`❓ Çeviri bulunamadı: ${item.word}`);
                                fixedItems.push(item);
                            }
                        });
                        success = true;
                    }
                } else {
                    console.warn(`⚠️ API Hatası: ${response.status}. Key değişiyor...`);
                    keyIndex = (keyIndex + 1) % apiKeys.length;
                    await delay(1000); // Wait a bit
                }
            } catch (e) {
                console.error("Hata:", e);
                retry++;
                await delay(2000);
            }
        }
        await delay(500); // Be nice
    }

    console.log(`✅ ${fixedItems.length} kelime çevrildi! İndiriliyor...`);

    // 3. İndir
    const blob = new Blob([JSON.stringify(fixedItems, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "duzeltilen_kelimeler_1000.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("💾 Dosya indirildi: duzeltilen_kelimeler_1000.json");
    console.log("👉 Bu dosyayı bana (AI'ye) gönderirsen veya içeriğini kopyalarsan ana dosyaya işleyebilirim.");
}

// Çalıştır
fixVocabularyInConsole();
