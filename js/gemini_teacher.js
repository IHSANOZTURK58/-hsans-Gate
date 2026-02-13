
// --- PRODUCTION-READY AI TEACHER LOGIC ---
const GeminiTeacher = {
    apiKey: "YOUR_KEY_HERE", // User must replace this
    model: "gemma-3-27b-it", // Using Gemma for massive 14.4K limit
    fallbackModel: "gemini-flash-latest", // Standard fallback

    state: {
        currentQuestion: null, // {source, target, answers, hint}
        questionQueue: [],    // Local cache for batch fetching
        score: 0,
        mode: 'EN_TR', // or 'TR_EN'
        level: 'Mixed', // Default
        isLoading: false
    },

    // Topics for variety
    // Massive Topic List for Variety
    topics: [
        "Daily Routine", "Travel & Adventure", "Food & Cooking", "Work & Business",
        "Hobbies & Sports", "Movies & Music", "Technology", "Family & Friends",
        "Shopping", "Weather", "Emotions & Feelings", "Health & Fitness",
        "Pop Culture", "Science & Nature", "History & Culture", "Economy & Finance",
        "Politics & Social Issues", "Art & Literature", "Space & Universe",
        "Psychology & Human Behavior", "Modern Problems", "Futuristic Tech",
        "Ancient Civilizations", "Philosophy & Ethics", "Mystery & Crime",
        "Fantasy & Mythology", "Environment & Sustainability", "Education & Learning",
        "Law & Justice", "Media & Journalism", "Animals & Wildlife", "Architecture",
        "Fashion & Design", "Dating & Relationships", "Job Interviews",
        "Emergency Situations", "Mythological Creatures", "Time Travel Scenarios"
    ],

    // Level-specific characteristics
    levelGuides: {
        "A1": "Beginner: Use basic nouns, present simple (to be, have, do). Short, clear sentences. No complex grammar.",
        "A2": "Elementary: Use past simple, future (going to), basic adjectives. Daily life scenarios.",
        "B1": "Intermediate: Use present perfect, modal verbs (should, could), conjunctions (because, although).",
        "B2": "Upper Intermediate: Use conditionals (types 1, 2), passive voice, phrasal verbs, more abstract topics.",
        "C1": "Advanced: Use complex syntax, idioms, professional/academic vocabulary, subtle nuances.",
        "C2": "Proficiency: Near-native level. Use sophisticated idioms, rare vocabulary, literary styles, complex nested structures."
    },

    init() {
        console.log("Initializing AI Teacher...");
        // Use existing app navigation
        app.state.previousView = app.state.currentView;
        app.state.currentView = 'ai-teacher';

        const startScreen = document.getElementById('ai-start-screen');
        const gameInterface = document.getElementById('ai-game-interface');

        // Show Start Screen, Hide Game
        if (startScreen) startScreen.classList.add('active');
        if (gameInterface) gameInterface.classList.add('hidden');

        // Reset Score & Level UI
        this.state.score = 0;
        this.state.questionQueue = []; // Clear queue on new session
        // ai-score removed from HTML as requested

        // Reset Level Select to default (using state)
        this.state.level = "Mixed";
        this.state.mode = "EN_TR";

        // Initial UI Update for Chips could be handled here or just assume HTML defaults
        // Reset Level Chips to Brightened Theme
        document.querySelectorAll('.ai-level-chip').forEach(c => {
            if (c.dataset.value === 'Mixed') {
                c.classList.add('active');
                c.style.background = 'rgba(139, 92, 246, 0.4)';
                c.style.border = '2px solid #c084fc';
                c.style.color = 'white';
                c.style.textShadow = '0 0 10px #c084fc';
                c.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            } else {
                c.classList.remove('active');
                c.style.background = 'rgba(255, 255, 255, 0.05)';
                c.style.border = '2px solid rgba(255, 255, 255, 0.1)';
                c.style.color = 'rgba(255, 255, 255, 0.6)';
                c.style.textShadow = 'none';
                c.style.boxShadow = 'none';
            }
        });

        // Reset Mode Chips to Brightened Theme
        document.querySelectorAll('.ai-selection-chip').forEach(c => {
            const label = c.querySelector('div:last-child');
            if (c.dataset.value === 'EN_TR') {
                c.classList.add('active');
                c.style.background = 'rgba(99, 102, 241, 0.4)';
                c.style.border = '2px solid #a5b4fc';
                if (label) label.style.color = 'white';
                c.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
            } else {
                c.classList.remove('active');
                c.style.background = 'rgba(255, 255, 255, 0.1)';
                c.style.border = '2px solid rgba(255, 255, 255, 0.2)';
                if (label) label.style.color = 'rgba(255, 255, 255, 0.7)';
                c.style.boxShadow = 'none';
            }
        });

        app.render(); // Switch view
    },

    setStartMode(mode, el) {
        this.state.mode = mode;
        // Toggle UI Active State
        document.querySelectorAll('.ai-selection-chip').forEach(c => {
            const label = c.querySelector('div:last-child');
            if (c === el) {
                c.classList.add('active');
                c.style.background = 'rgba(99, 102, 241, 0.4)';
                c.style.border = '2px solid #a5b4fc';
                if (label) label.style.color = 'white';
                c.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
            } else {
                c.classList.remove('active');
                c.style.background = 'rgba(255, 255, 255, 0.1)';
                c.style.border = '2px solid rgba(255, 255, 255, 0.2)';
                if (label) label.style.color = 'rgba(255, 255, 255, 0.7)';
                c.style.boxShadow = 'none';
            }
        });
    },

    setStartLevel(level, el) {
        this.state.level = level;
        // Toggle UI Active State
        document.querySelectorAll('.ai-level-chip').forEach(c => {
            if (c === el) {
                c.classList.add('active');
                c.style.background = level === 'Mixed' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255,255,255,0.2)';
                c.style.border = '2px solid ' + (this.getLevelColor(level) || '#8b5cf6');
                c.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            } else {
                c.classList.remove('active');
                c.style.background = 'rgba(255,255,255,0.05)';
                c.style.border = '2px solid rgba(255,255,255,0.1)';
                c.style.color = 'rgba(255,255,255,0.6)';
                c.style.boxShadow = 'none';
            }
        });
        // Set specific color for selected chip
        el.style.color = 'white';
        el.style.textShadow = '0 0 10px ' + (this.getLevelColor(level) || 'transparent');
    },

    getLevelColor(level) {
        const colors = {
            'Mixed': '#c084fc', 'A1': '#86efac', 'A2': '#93c5fd',
            'B1': '#fde047', 'B2': '#fdba74', 'C1': '#fca5a5', 'C2': '#d8b4fe'
        };
        return colors[level];
    },

    startSession() {
        // Mode and Level are already set via chips
        document.getElementById('ai-start-screen').classList.remove('active');
        document.getElementById('ai-game-interface').classList.remove('hidden');

        // Update level badge in game
        const badge = document.getElementById('ai-active-level-badge');
        if (badge) {
            const levelMap = {
                "Mixed": "Karışık", "A1": "A1 Başlangıç", "A2": "A2 Temel",
                "B1": "B1 Orta", "B2": "B2 Orta-İleri", "C1": "C1 İleri", "C2": "C2 Uzman"
            };
            badge.textContent = `Seviye: ${levelMap[this.state.level] || this.state.level}`;
        }

        // Update mode indicator in header
        const btnText = document.getElementById('ai-mode-text');
        if (btnText) {
            btnText.textContent = this.state.mode === 'EN_TR' ? "🇬🇧 → 🇹🇷" : "🇹🇷 → 🇬🇧";
        }

        this.nextQuestion();
    },

    setLevel(newLevel) {
        this.state.level = newLevel;
        console.log(`[AI Teacher] Level set to: ${newLevel}`);
        this.state.questionQueue = []; // Clear queue to force fresh level fetch
        this.nextQuestion();
    },

    async nextQuestion() {
        if (this.state.isLoading) return;

        // Check Local Queue First for Instant Loading
        if (this.state.questionQueue.length > 0) {
            console.log("[AI Teacher] Serving from local queue...");
            const nextData = this.state.questionQueue.shift();
            this.state.currentQuestion = nextData;
            this.updateQuestionUI(nextData);

            // Background Buffer Check: If queue is getting low (<=1), fetch more in background
            if (this.state.questionQueue.length <= 1) {
                console.log("[AI Teacher] Queue low, pre-fetching more in background...");
                this.fetchQuestionAPI(true); // silent fetch
            }
            return;
        }

        // Full UI Reset & Fetch (When queue is empty)
        this.state.currentQuestion = null;
        this.state.isLoading = true;

        const sourceEl = document.getElementById('ai-source-text');
        const inputEl = document.getElementById('ai-user-input');
        const hintEl = document.getElementById('ai-hint');
        const feedbackEl = document.getElementById('ai-feedback-text');
        const btnCheck = document.getElementById('btn-ai-check');
        const btnNext = document.getElementById('btn-ai-next');
        const btnExplain = document.getElementById('btn-ai-show-explanation');
        sourceEl.textContent = "Hazırlanıyor...";
        sourceEl.classList.add('pulse');
        inputEl.value = "";
        inputEl.disabled = true;
        hintEl.style.opacity = '0';

        // Start rotating loading messages
        this.startLoadingAnimation(sourceEl);

        // Reset UI Components
        feedbackEl.classList.add('hidden');
        feedbackEl.style.display = 'none';
        feedbackEl.className = 'feedback-message hidden';
        feedbackEl.innerHTML = '';

        const richArea = document.getElementById('ai-rich-feedback');
        if (richArea) {
            richArea.classList.add('hidden');
            richArea.classList.remove('active');
        }
        if (btnExplain) btnExplain.classList.add('hidden');

        const vocabTagsEl = document.getElementById('ai-vocab-tags');
        if (vocabTagsEl) vocabTagsEl.innerHTML = '';
        const warningTipEl = document.getElementById('ai-warning-tip');
        if (warningTipEl) warningTipEl.classList.add('hidden');

        btnCheck.classList.remove('hidden');
        btnNext.classList.add('hidden');

        try {
            await this.fetchQuestionAPI();
            // After fetch, show the first item
            if (this.state.questionQueue.length > 0) {
                const nextData = this.state.questionQueue.shift();
                this.state.currentQuestion = nextData;
                this.updateQuestionUI(nextData);
            }
        } catch (error) {
            console.error("API Error:", error);
            sourceEl.textContent = "Hata oluştu. Lütfen tekrar dene.";
            this.state.isLoading = false;
        } finally {
            this.stopLoadingAnimation();
        }
    },

    updateQuestionUI(q) {
        const sourceEl = document.getElementById('ai-source-text');
        const inputEl = document.getElementById('ai-user-input');
        const hintEl = document.getElementById('ai-hint');
        const btnCheck = document.getElementById('btn-ai-check');
        const btnNext = document.getElementById('btn-ai-next');
        const feedbackEl = document.getElementById('ai-feedback-text');
        const labelEl = document.querySelector('.label-sm');

        if (labelEl) {
            labelEl.textContent = this.state.mode === 'EN_TR' ? "İngilizce → Türkçe Çeviri:" : "Türkçe → İngilizce Çeviri:";
        }

        sourceEl.textContent = q.source_text;
        sourceEl.classList.remove('pulse');
        inputEl.value = "";
        inputEl.disabled = false;
        inputEl.focus();

        hintEl.textContent = `İpucu: ${q.hint}`;
        hintEl.style.opacity = '1';

        feedbackEl.classList.add('hidden');
        btnCheck.classList.remove('hidden');
        btnNext.classList.add('hidden');

        this.state.isLoading = false;
    },

    startLoadingAnimation(el) {
        const messages = [
            "Öğretmen hazırlık yapıyor...",
            "Cümle yapısı kurgulanıyor...",
            "Gramer kuralları taranıyor...",
            "Senin için yeni kelimeler seçiliyor...",
            "Hazırlık tamamlanıyor..."
        ];
        let i = 0;
        this.loadingInterval = setInterval(() => {
            el.textContent = messages[i % messages.length];
            i++;
        }, 1500);
    },

    stopLoadingAnimation() {
        if (this.loadingInterval) clearInterval(this.loadingInterval);
    },

    async fetchQuestionAPI(isSilent = false) {
        if (!isSilent) this.state.isLoading = true;

        const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
        const targetLevel = this.state.level === 'Mixed' ?
            ["A1", "A2", "B1", "B2", "C1"][Math.floor(Math.random() * 5)] :
            this.state.level;

        const prompt = `
        You are an expert English teacher.
        Current Translation Mode: ${this.state.mode === 'EN_TR' ? 'English to Turkish' : 'Turkish to English'}.
        
        Goal: Generate 5 distinct and high-quality sentences at level ${targetLevel}.
        Topic to use (roughly): ${randomTopic}.

        --- RULES ---
        1. Direction: 
           - If mode is English to Turkish: "q_text" MUST be English, "a_text" MUST be Turkish.
           - If mode is Turkish to English: "q_text" MUST be Turkish, "a_text" MUST be English.
        2. Adaptive Difficulty: STRICTLY ${targetLevel}.
        3. Content: Daily life, business, or travel situations. Use natural language.
        4. Strict JSON: Output ONLY a JSON array containing 5 objects. No Markdown, no conversation.
        5. Variation: Different sentence structures for each item.

        --- OUTPUT FORMAT (MUST BE A JSON ARRAY) ---
        [
          {
            "q_text": "Sentence to translate (based on mode)",
            "a_text": "Main translation (based on mode)",
            "alternatives": ["Acceptable alternative 1", "Acceptable alternative 2"],
            "feedback": {
              "grammar_tip": "EXPLANATION IN TURKISH about the sentence structure.",
              "vocabulary": [{"word": "the word", "type": "its type", "meaning": "TURKISH meaning"}],
              "warning": "TIP IN TURKISH about common mistakes."
            }
          },
          ... up to 5 items
        ]
        `;

        try {
            const baseUrl = window.ttsManager ? window.ttsManager.proxyUrl : 'http://localhost:3000';
            const apiUrl = `${baseUrl}/api/ai/generate`;

            console.log(`[AI Teacher] Fetching LinguaSensei from: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    model: this.model
                })
            });

            if (!response.ok) {
                if (response.status === 404 || response.status === 500) {
                    if (this.model !== this.fallbackModel) {
                        this.model = this.fallbackModel;
                        return this.fetchQuestionAPI(isSilent);
                    }
                }
                const errData = await response.json().catch(() => ({}));
                throw new Error("Quota or Server Error");
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let rawData;
            try {
                rawData = JSON.parse(jsonStr);
            } catch (pErr) {
                console.error("JSON Parse Error. Data:", jsonStr);
                throw new Error("AI yanıtı okunamadı.");
            }

            const questions = Array.isArray(rawData) ? rawData : [rawData];

            questions.forEach(qItem => {
                const fb = qItem.feedback || {};
                const grammarTip = fb.grammar_tip || "Not yok.";

                this.state.questionQueue.push({
                    source_text: qItem.q_text,
                    target_text_main: qItem.a_text,
                    acceptable_answers: [qItem.a_text, ...(qItem.alternatives || [])],
                    hint: grammarTip.substring(0, 50) + "...",
                    feedback: {
                        grammar_tip: grammarTip,
                        vocabulary: fb.vocabulary || [],
                        warning: fb.warning || ""
                    }
                });
            });

            console.log(`[AI Teacher] ${questions.length} questions added to queue. Total: ${this.state.questionQueue.length}`);
            if (!isSilent) this.state.isLoading = false;

        } catch (error) {
            console.error("API Error:", error);
            if (!isSilent) throw error;
        }
    },

    handleInputKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Stop form submission or other defaults
            if (!document.getElementById('ai-feedback-text').classList.contains('hidden')) {
                // If feedback is already shown, Enter goes to NEXT
                this.nextQuestion();
            } else {
                // Otherwise checks answer
                this.checkAnswer();
            }
        }
    },

    checkAnswer() {
        if (!this.state.currentQuestion) return;

        const inputEl = document.getElementById('ai-user-input');
        const userVal = inputEl.value.trim().toLowerCase();

        if (!userVal) return;

        // Client-Side Validation Logic
        const normalize = (str) => str.replace(/[.,!?'"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

        const normalizedUser = normalize(userVal);
        const correctOptions = this.state.currentQuestion.acceptable_answers.map(normalize);

        // Check exact match or inclusion
        const isCorrect = correctOptions.some(opt => opt === normalizedUser || opt.includes(normalizedUser));

        this.showFeedback(isCorrect);
    },

    showFeedback(isCorrect) {
        const feedbackEl = document.getElementById('ai-feedback-text');
        const btnCheck = document.getElementById('btn-ai-check');
        const btnNext = document.getElementById('btn-ai-next');
        const inputEl = document.getElementById('ai-user-input');
        const btnExplain = document.getElementById('btn-ai-show-explanation');

        const richArea = document.getElementById('ai-rich-feedback');
        const grammarTipEl = document.getElementById('ai-grammar-tip');
        const warningTipEl = document.getElementById('ai-warning-tip');
        const vocabTagsEl = document.getElementById('ai-vocab-tags');

        const q = this.state.currentQuestion;

        // FORCE SHOW Result Text
        feedbackEl.classList.remove('hidden');
        feedbackEl.style.display = 'block';
        inputEl.disabled = true;

        if (isCorrect) {
            this.state.score++;
            feedbackEl.textContent = "✅ Harika! Doğru Cevap.";
            feedbackEl.className = "feedback-message success";

            grammarTipEl.textContent = q.feedback.grammar_tip;
            warningTipEl.classList.add('hidden');

            if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
            const correctAnswer = q.target_text_main || q.acceptable_answers[0];
            feedbackEl.innerHTML = `❌ Malesef.<br>Doğrusu: <b>${correctAnswer}</b>`;
            feedbackEl.className = "feedback-message error";

            grammarTipEl.textContent = q.feedback.grammar_tip;

            // Show Warning if exists
            if (q.feedback.warning) {
                warningTipEl.textContent = `💡 Dikkat: ${q.feedback.warning}`;
                warningTipEl.classList.remove('hidden');
            }

            // Show "Show Explanation" button ONLY if wrong or even if correct?
            // User said "altta cevap yanlış dediğimizde açıklamayı göster diye bir ok tuşu olsun"
            if (btnExplain) btnExplain.classList.remove('hidden');
        }

        // Always show explanation button for better learning? 
        // Let's stick to "wrong" as requested, but maybe showing it always is better.
        // The user specifically mentioned "yanlış dediğimizde".
        if (!isCorrect && btnExplain) btnExplain.classList.remove('hidden');
        // Actually, let's show it always if there is a grammar tip, but prioritize user request.
        if (btnExplain) btnExplain.classList.remove('hidden');

        // Render Vocabulary Tags
        this.renderVocabulary(q.feedback.vocabulary);

        // Switch Buttons
        btnCheck.classList.add('hidden');
        btnNext.classList.remove('hidden');
        btnNext.focus();
    },

    toggleExplanation(show) {
        const richArea = document.getElementById('ai-rich-feedback');
        if (!richArea) return;

        if (show) {
            richArea.classList.remove('hidden');
            // Small delay to trigger CSS transition
            setTimeout(() => richArea.classList.add('active'), 10);
        } else {
            richArea.classList.remove('active');
            // Hide completely after transition
            setTimeout(() => richArea.classList.add('hidden'), 400);
        }
    },

    renderVocabulary(vocab) {
        const vocabTagsEl = document.getElementById('ai-vocab-tags');
        vocabTagsEl.innerHTML = ''; // Clear

        if (!vocab || vocab.length === 0) return;

        vocab.forEach(item => {
            const chip = document.createElement('div');
            chip.style.cssText = `
                background: rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.3);
                padding: 0.3rem 0.6rem;
                border-radius: 8px;
                font-size: 0.85rem;
                color: #c4b5fd;
            `;
            chip.innerHTML = `<strong>${item.word}</strong> <span style="font-size:0.7rem; opacity:0.7;">(${item.type})</span>: ${item.meaning}`;
            vocabTagsEl.appendChild(chip);
        });
    }
};

// Expose to window for HTML calls
window.GeminiTeacher = GeminiTeacher;
