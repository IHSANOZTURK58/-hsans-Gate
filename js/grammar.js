const GRAMMAR_DATA = [
    // --- LEVEL A1 ---
    {
        id: "a1_1",
        level: "A1",
        topic_id: "tenses",
        topic: "To Be (Am/Is/Are)",
        question: "She ___ my best friend.",
        options: ["am", "is", "are"],
        correct: 1,
        explanation: "Tekil şahıslarda (He/She/It) 'is' kullanılır."
    },
    {
        id: "a1_2",
        level: "A1",
        topic_id: "tenses",
        topic: "To Be (Am/Is/Are)",
        question: "They ___ happy today.",
        options: ["am", "is", "are"],
        correct: 2,
        explanation: "Çoğul öznelerde (They/We/You) 'are' kullanılır."
    },
    {
        id: "a1_3",
        level: "A1",
        topic_id: "tenses",
        topic: "Present Simple",
        question: "He ___ football every weekend.",
        options: ["play", "plays", "playing"],
        correct: 1,
        explanation: "Geniş zamanda (Present Simple) He/She/It özneleri için fiile '-s' takısı gelir."
    },
    {
        id: "a1_4",
        level: "A1",
        topic_id: "articles",
        topic: "Articles (A/An)",
        question: "I have ___ apple.",
        options: ["a", "an", "the"],
        correct: 1,
        explanation: "Sesli harfle başlayan tekil nesnelerden önce 'an' kullanılır."
    },
    {
        id: "a1_5",
        level: "A1",
        topic_id: "prepositions",
        topic: "Prepositions (In/On/At)",
        question: "The book is ___ the table.",
        options: ["in", "on", "at"],
        correct: 1,
        explanation: "Bir yüzeyin üzerinde olma durumunda 'on' kullanılır."
    },

    // --- LEVEL A2 ---
    {
        id: "a2_1",
        level: "A2",
        topic_id: "tenses",
        topic: "Past Simple",
        question: "We ___ to the cinema yesterday.",
        options: ["go", "goed", "went"],
        correct: 2,
        explanation: "'Go' fiilinin geçmiş zaman hali düzensizdir ve 'went' olur."
    },
    {
        id: "a2_2",
        level: "A2",
        topic_id: "comparatives",
        topic: "Comparatives",
        question: "This car is ___ than that one.",
        options: ["fast", "faster", "fastest"],
        correct: 1,
        explanation: "İki şeyi kıyaslarken 'faster than' (daha hızlı) yapısı kullanılır."
    },
    {
        id: "a2_3",
        level: "A2",
        topic_id: "tenses",
        topic: "Present Continuous",
        question: "Listen! She ___ the piano.",
        options: ["plays", "is playing", "played"],
        correct: 1,
        explanation: "Şu anda, konuşma anında gerçekleşen eylemler için 'is playing' kullanılır."
    },
    {
        id: "a2_4",
        level: "A2",
        topic_id: "modals",
        topic: "Modals (Can)",
        question: "I ___ swim very well.",
        options: ["can", "cans", "canning"],
        correct: 0,
        explanation: "Yetenek bildirirken 'can' kullanılır ve ek almaz."
    },
    {
        id: "a2_5",
        level: "A2",
        topic_id: "possessives",
        topic: "Possessives",
        question: "Is this book ___?",
        options: ["your", "yours", "you"],
        correct: 1,
        explanation: "İyelik zamiri olarak 'yours' kullanılır."
    },

    // --- LEVEL B1 ---
    {
        id: "b1_1",
        level: "B1",
        topic_id: "tenses",
        topic: "Present Perfect",
        question: "I ___ seen that movie twice.",
        options: ["have", "has", "had"],
        correct: 0,
        explanation: "'I/You/We/They' ile Present Perfect yapısında 'have' kullanılır."
    },
    {
        id: "b1_2",
        level: "B1",
        topic_id: "conditionals",
        topic: "First Conditional",
        question: "If it rains, we ___ inside.",
        options: ["stay", "will stay", "stayed"],
        correct: 1,
        explanation: "First Conditional: If + Present Simple, Future Simple (will)."
    },
    {
        id: "b1_3",
        level: "B1",
        topic_id: "passive",
        topic: "Passive Voice",
        question: "The letter ___ by Sarah yesterday.",
        options: ["wrote", "was written", "is written"],
        correct: 1,
        explanation: "Geçmişte yapılan eylem (Passive): was/were + V3."
    },
    {
        id: "b1_4",
        level: "B1",
        topic_id: "modals",
        topic: "Modals (Must/Have to)",
        question: "You ___ wear a uniform at school.",
        options: ["must", "can", "should"],
        correct: 0,
        explanation: "Zorunluluk (kural gereği) durumlarında 'must' veya 'have to' kullanılır."
    },
    {
        id: "b1_5",
        level: "B1",
        topic_id: "gerunds",
        topic: "Gerunds vs Infinitives",
        question: "I enjoy ___ books.",
        options: ["read", "to read", "reading"],
        correct: 2,
        explanation: "'Enjoy' fiilinden sonra gelen fiil -ing alır (Gerund)."
    },

    // --- LEVEL B2 ---
    {
        id: "b2_1",
        level: "B2",
        topic_id: "conditionals",
        topic: "Second Conditional",
        question: "If I ___ you, I would accept the offer.",
        options: ["am", "was", "were"],
        correct: 2,
        explanation: "Second Conditional: Hayali durumlar için tüm öznelerle 'were' kullanılır."
    },
    {
        id: "b2_2",
        level: "B2",
        topic_id: "tenses",
        topic: "Past Perfect",
        question: "By the time we arrived, the film ___ started.",
        options: ["has", "had", "was"],
        correct: 1,
        explanation: "Geçmişte başka bir olaydan önce gerçekleşen eylem için Past Perfect (had V3) kullanılır."
    },
    {
        id: "b2_3",
        level: "B2",
        topic_id: "reported",
        topic: "Reported Speech",
        question: "She said that she ___ to the party.",
        options: ["come", "is coming", "was coming"],
        correct: 2,
        explanation: "Dolaylı anlatımda zaman bir derece geçmişe kaydırılır (Present Cont. -> Past Cont.)."
    },
    {
        id: "b2_4",
        level: "B2",
        topic_id: "relative",
        topic: "Relative Clauses",
        question: "The man ___ lives next door is a doctor.",
        options: ["which", "who", "whom"],
        correct: 1,
        explanation: "İnsanları nitelerken özne konumunda 'who' kullanılır."
    },
    {
        id: "b2_5",
        level: "B2",
        topic_id: "conditionals",
        topic: "Third Conditional",
        question: "If you had studied, you ___ passed.",
        options: ["would have", "will have", "would"],
        correct: 0,
        explanation: "Third Conditional: If + Past Perfect, would have + V3."
    },
    {
        id: "b2_6",
        level: "B2",
        topic_id: "phrasal",
        topic: "Phrasal Verbs",
        question: "We ran ___ of gas on the highway.",
        options: ["out", "off", "away"],
        correct: 0,
        explanation: "'Run out of': Tükenmek, bitmek anlamına gelir."
    }
];

if (typeof window !== 'undefined') {
    window.GRAMMAR_DATA = GRAMMAR_DATA;
}
