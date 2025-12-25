/**
 * English Vocabulary Game - Survival Mode
 */

// Firebase Compat Mode - No imports needed
// Uses global 'firebase' object

// Config
const firebaseConfig = {
    apiKey: "AIzaSyAj6zt-30z_BX5jIM8JQW8kbK6qHSatZwQ",
    authDomain: "ihsansgate.firebaseapp.com",
    projectId: "ihsansgate",
    storageBucket: "ihsansgate.firebasestorage.app",
    messagingSenderId: "731110929518",
    appId: "1:731110929518:web:723c3dd71d593c5e04627f",
    measurementId: "G-S2FEZYQRR4"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const app = {
    // Config
    POINTS_PER_QUESTION: 5,
    JOKER_COST: 200,
    MAX_LEADERBOARD: 5, // Request: Limit to top 5

    state: {
        currentView: 'menu',
        score: 0,
        leaderboard: [], // Global Data
        wallet: 0,
        favorites: [],
        customWords: [],
        selectedAddLevel: 'A1',
        currentWord: null,
        currentOptions: [],
        filters: { search: '', showFavsOnly: false },

        // Audio State
        isMusicPlaying: false,
        musicVolume: 0.3,

        // New Mode State
        playerName: '',
        gameMode: 'survival', // 'survival' | 'rush'
        lives: 3,
        timer: 120, // seconds
        timer: 120, // seconds
        timerInterval: null,
        pendingPasswordAction: null // 'reset' | 'addWord'
    },

    init() {
        this.loadData();
        this.setupUI();
        this.setupUI();
        this.setupFirebaseListener();
        this.initMusic();

        // Force hide gameover modal on startup to prevent it from showing over menu
        const modal = document.getElementById('view-gameover');
        if (modal) modal.classList.add('hidden');

        this.render();
        this.renderLeaderboard();
    },

    setupFirebaseListener() {
        // Compat Syntax
        db.collection("scores")
            .orderBy("score", "desc")
            .limit(this.MAX_LEADERBOARD)
            .onSnapshot((snapshot) => {
                this.state.leaderboard = [];
                snapshot.forEach((doc) => {
                    this.state.leaderboard.push(doc.data());
                });
                this.renderLeaderboard();
            });
    },

    getAllWords() {
        const staticData = window.WORD_DATA || [];
        return [...staticData, ...this.state.customWords];
    },

    loadData() {
        const stored = localStorage.getItem('vocab_game_data_v2');
        if (stored) {
            const data = JSON.parse(stored);
            // Leaderboard is now global, don't load local one except for migration maybe?
            // this.state.leaderboard = data.leaderboard || []; 
            this.state.wallet = data.wallet || 0;
            this.state.favorites = data.favorites || [];
            this.state.customWords = data.customWords || [];
        } else {
            // New user or cleared data
            this.state.wallet = 0;
            this.state.favorites = [];
            this.state.customWords = [];
        }
        this.updateHeaderStats();
    },

    saveData() {
        const data = {
            // leaderboard: this.state.leaderboard, // Don't save global board to local
            wallet: this.state.wallet,
            favorites: this.state.favorites,
            customWords: this.state.customWords
        };
        localStorage.setItem('vocab_game_data_v2', JSON.stringify(data));
        this.updateHeaderStats();
    },

    setupUI() {
        document.addEventListener('dblclick', (e) => e.preventDefault());

        // Input validation for Name
        const nameInput = document.getElementById('menu-player-name');
        if (nameInput) {
            nameInput.value = localStorage.getItem('last_player_name') || '';
            nameInput.addEventListener('input', (e) => {
                this.state.playerName = e.target.value.trim();
                const hasName = this.state.playerName.length > 0;
                // Visual feedback could be added here if needed
            });
        }
    },

    // Navigation
    showMenu() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.currentView = 'menu';
        document.getElementById('view-gameover').classList.add('hidden');
        this.render();
        this.renderLeaderboard();
    },

    startGame(mode) {
        // Mevcut modu koru veya varsayılan olarak survival kullan
        const targetMode = mode || this.state.gameMode || 'survival';

        const nameInput = document.getElementById('menu-player-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            alert("⚠️ Lütfen önce isminizi yazın!");
            // Shake effect or focus
            nameInput.focus();
            nameInput.style.border = '2px solid #ef4444';
            setTimeout(() => nameInput.style.border = '', 2000);
            return;
        }

        this.state.playerName = name;
        localStorage.setItem('last_player_name', name);
        this.state.gameMode = targetMode;
        this.state.score = 0;

        if (targetMode === 'rush') {
            this.state.lives = 3;
            this.state.timer = 120; // 2 minutes
            this.startTimer();
        } else if (targetMode === 'favorites') {
            if (this.state.favorites.length < 4) {
                alert("⚠️ Favoriler modunu açmak için en az 4 kelimeyi favorilemelisiniz!");
                this.showMenu();
                return;
            }
            this.state.lives = 3;
            this.state.timer = 0;
        } else {
            this.state.lives = 1;
            this.state.timer = 0;
        }

        this.state.currentView = 'game';
        document.getElementById('view-gameover').classList.add('hidden');

        this.updateHeaderStats();
        this.updateScoreDisplay();
        this.nextQuestion();
        this.render();
    },

    startTimer() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);

        this.updateTimerUI(); // Init
        this.state.timerInterval = setInterval(() => {
            this.state.timer--;
            this.updateTimerUI();

            if (this.state.timer <= 0) {
                this.endGame(true); // true = time out
            }
        }, 1000);
    },

    updateTimerUI() {
        const timerEl = document.getElementById('game-timer');
        if (timerEl) {
            const m = Math.floor(this.state.timer / 60).toString().padStart(2, '0');
            const s = (this.state.timer % 60).toString().padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;

            if (this.state.timer <= 10) {
                timerEl.style.color = '#ef4444';
                timerEl.style.borderColor = '#ef4444';
            } else {
                timerEl.style.color = 'var(--accent-gold)';
                timerEl.style.borderColor = 'var(--accent-gold)';
            }
        }
    },

    showWordList() {
        this.state.currentView = 'list';
        this.renderList();
        this.render();
    },

    resetProgress() {
        this.state.pendingPasswordAction = 'reset';
        this.openPasswordModal("İlerlemeyi sıfırlamak için parolayı girin:");
    },

    openPasswordModal(message) {
        const modal = document.getElementById('view-password-modal');
        const msgEl = document.getElementById('password-modal-msg');
        if (modal) {
            if (msgEl) msgEl.textContent = message;
            modal.classList.remove('hidden');
            const input = document.getElementById('reset-password-input');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    },

    closePasswordModal() {
        this.state.pendingPasswordAction = null;
        const modal = document.getElementById('view-password-modal');
        if (modal) modal.classList.add('hidden');
        const input = document.getElementById('reset-password-input');
        if (input) input.value = '';
    },

    async submitPassword() {
        const input = document.getElementById('reset-password-input');
        const password = input ? input.value : '';

        if (password === '24103021031') {
            // Password Correct
            const action = this.state.pendingPasswordAction;
            this.closePasswordModal();

            if (action === 'reset') {
                await this.performReset();
            } else if (action === 'addWord') {
                this.performShowAddWord();
            }

        } else {
            alert("⚠️ Yanlış Parola!");
            if (input) {
                input.value = '';
                input.focus();
                input.style.border = '2px solid #ef4444';
                setTimeout(() => input.style.border = '', 2000);
            }
        }
    },

    async performReset() {
        if (!confirm("⚠️ DIKKAT: Bu işlem TÜM DÜNYADAKİ rekor listesini temizleyecek!\n(Kişisel elmaslar silinmez.)\n\nDevam etmek istiyor musun?")) return;

        try {
            // Get all scores
            const snapshot = await db.collection("scores").get();

            // Batch delete
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert("✅ Global Rekor Tablosu Başarıyla Temizlendi!");
        } catch (e) {
            console.error("Error clearing leaderboard: ", e);
            alert("Hata oluştu: " + e.message);
        }
    },

    // Game Logic
    nextQuestion() {
        let data = this.getAllWords();

        if (this.state.gameMode === 'favorites') {
            data = data.filter(w => this.state.favorites.includes(w.id));
        }

        if (!data || data.length < 4) { console.error("Data error or insufficient favorites"); return; }
        const targetIndex = Math.floor(Math.random() * data.length);
        this.state.currentWord = data[targetIndex];

        const distractors = [];
        while (distractors.length < 3) {
            const idx = Math.floor(Math.random() * data.length);
            if (idx !== targetIndex && !distractors.includes(idx)) distractors.push(idx);
        }

        const indices = [targetIndex, ...distractors];
        this.shuffleArray(indices);
        this.state.currentOptions = indices.map(idx => data[idx]);

        this.renderGameQuestion();
    },

    renderGameQuestion() {
        const word = this.state.currentWord;
        document.getElementById('target-word').textContent = word.word;
        document.getElementById('word-level').textContent = word.level || 'A1';

        const starBtn = document.getElementById('game-star-btn');
        const isFav = this.state.favorites.includes(word.id);
        if (starBtn) {
            if (isFav) {
                starBtn.classList.add('active');
                starBtn.querySelector('svg').setAttribute('fill', 'currentColor');
            } else {
                starBtn.classList.remove('active');
                starBtn.querySelector('svg').setAttribute('fill', 'none');
            }
        }

        const container = document.getElementById('options-container');
        container.innerHTML = '';

        this.state.currentOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt.meaning;
            btn.dataset.id = opt.id;
            btn.onclick = () => this.handleAnswer(opt, btn);
            container.appendChild(btn);
        });

        // Joker State
        const jokerBtn = document.getElementById('btn-joker');
        if (jokerBtn) {
            jokerBtn.disabled = this.state.wallet < this.JOKER_COST;
            jokerBtn.style.opacity = this.state.wallet < this.JOKER_COST ? 0.5 : 1;
        }
    },

    handleAnswer(selectedOption, btnElement) {
        if (!this.state.currentWord) return;

        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        const isCorrect = selectedOption.id === this.state.currentWord.id;

        if (isCorrect) {
            btnElement.classList.add('correct');
            this.state.score += this.POINTS_PER_QUESTION;
            this.updateScoreDisplay();
            setTimeout(() => this.nextQuestion(), 800);
        } else {
            btnElement.classList.add('wrong');
            // Show correct
            allBtns.forEach(b => {
                if (parseInt(b.dataset.id) === this.state.currentWord.id) b.classList.add('correct');
            });

            // Logic Split
            if (this.state.gameMode === 'rush') {
                this.state.lives--;
                this.renderLives(); // Need to implement/update this helper or do it in renderGameQuestion? 
                // Better to update UI immediately
                const livesEl = document.getElementById('game-lives');
                if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);

                if (this.state.lives <= 0) {
                    setTimeout(() => this.endGame(), 1500);
                } else {
                    setTimeout(() => this.nextQuestion(), 1000);
                }
            } else if (this.state.gameMode === 'favorites') {
                this.state.lives--;
                this.renderLives();
                const livesEl = document.getElementById('game-lives');
                if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);

                if (this.state.lives <= 0) {
                    setTimeout(() => this.endGame(), 1500);
                } else {
                    setTimeout(() => this.nextQuestion(), 1000);
                }
            } else {
                // Survival - Instant Death
                setTimeout(() => this.endGame(), 1500);
            }
        }
    },

    endGame(isTimeOut = false) {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);

        // Add Score to Wallet
        if (this.state.score > 0) {
            this.state.wallet += this.state.score;
        }

        // Leaderboard logic ONLY for Rush mode
        if (this.state.gameMode === 'rush' && this.state.score > 0) {
            this.saveScoreToFirebase();
        }

        this.saveData();

        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('earned-wallet').textContent = this.state.score;

        // Show correct header
        const title = document.querySelector('#view-gameover h3');
        if (title) {
            title.textContent = isTimeOut ? "⏰ Süre Doldu!" : (this.state.lives <= 0 ? "💔 Canın Kalmadı!" : "😵 Oyun Bitti!");
        }

        // Hide old input area definitely
        const nameInputArea = document.getElementById('name-input-area');
        if (nameInputArea) nameInputArea.classList.add('hidden');

        document.getElementById('view-gameover').classList.remove('hidden');
    },

    // Helper needed for Rush Mode UI
    renderLives() {
        const livesEl = document.getElementById('game-lives');
        if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);
    },

    useJoker() {
        if (this.state.wallet < this.JOKER_COST) return;

        this.state.wallet -= this.JOKER_COST;
        this.saveData();
        this.updateHeaderStats();

        const allBtns = Array.from(document.querySelectorAll('.option-btn'));
        const correctId = this.state.currentWord.id;
        let wrongBtns = allBtns.filter(b => parseInt(b.dataset.id) !== correctId);

        this.shuffleArray(wrongBtns);
        if (wrongBtns.length > 0) wrongBtns[0].style.visibility = 'hidden';
        if (wrongBtns.length > 1) wrongBtns[1].style.visibility = 'hidden';

        document.getElementById('btn-joker').disabled = true;
    },

    // Favorites & List
    toggleFavorite(id) {
        const index = this.state.favorites.indexOf(id);
        if (index === -1) this.state.favorites.push(id);
        else this.state.favorites.splice(index, 1);
        this.saveData();
    },

    toggleGameFavorite() {
        if (!this.state.currentWord) return;
        this.toggleFavorite(this.state.currentWord.id);

        // Update UI
        const isFav = this.state.favorites.includes(this.state.currentWord.id);
        const starBtn = document.getElementById('game-star-btn');
        if (starBtn) {
            if (isFav) {
                starBtn.classList.add('active');
                starBtn.querySelector('svg').setAttribute('fill', 'currentColor');
            } else {
                starBtn.classList.remove('active');
                starBtn.querySelector('svg').setAttribute('fill', 'none');
            }
        }
    },

    renderList() {
        const container = document.getElementById('word-list-items');
        container.innerHTML = '';
        let filtered = this.getAllWords();

        // Update Total Count
        document.getElementById('total-word-count').textContent = filtered.length;

        const search = this.state.filters.search.toLowerCase();
        if (search) {
            filtered = filtered.filter(w => w.word.toLowerCase().includes(search) || w.meaning.toLowerCase().includes(search));
        }
        if (this.state.filters.showFavsOnly) {
            filtered = filtered.filter(w => this.state.favorites.includes(w.id));
        }

        const displayList = filtered.slice(0, 100);

        if (displayList.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 2rem;">Sonuç yok.</p>';
            return;
        }

        displayList.forEach(w => {
            const isFav = this.state.favorites.includes(w.id);
            const item = document.createElement('div');
            item.className = 'word-item';
            item.innerHTML = `
                <div><h3>${w.word} <span style="font-size:0.7em; opacity:0.6">${w.level || ''}</span></h3><p>${w.meaning}</p></div>
                <button class="btn-star" onclick="app.toggleFavorite(${w.id}); app.renderList()">
                    <span style="font-size:1.5rem; color:${isFav ? 'var(--accent-gold)' : 'inherit'}">${isFav ? '★' : '☆'}</span>
                </button>
            `;
            container.appendChild(item);
        });
    },

    // Utilities/Helpers
    updateHeaderStats() {
        document.getElementById('wallet-amount').textContent = this.state.wallet;
        if (this.state.currentView === 'game') {
            const jokerBtn = document.getElementById('btn-joker');
            if (jokerBtn) jokerBtn.disabled = this.state.wallet < this.JOKER_COST;
        }
    },

    // Add Custom Word Logic
    showAddWord() {
        this.state.pendingPasswordAction = 'addWord';
        this.openPasswordModal("Yeni kelime eklemek için parolayı girin:");
    },

    performShowAddWord() {
        this.state.currentView = 'add-word';
        this.render();
        // Reset inputs
        document.getElementById('new-word-en').value = '';
        document.getElementById('new-word-tr').value = '';
        this.selectLevel('A1'); // Default Reset
    },

    selectLevel(lvl, btnElement) {
        this.state.selectedAddLevel = lvl;
        if (btnElement) {
            document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
        } else {
            // Programmatic reset
            document.querySelectorAll('.lvl-btn').forEach(b => {
                b.classList.remove('active');
                if (b.textContent === lvl) b.classList.add('active');
            });
        }
    },

    saveNewWord() {
        const wordInput = document.getElementById('new-word-en');
        const meanInput = document.getElementById('new-word-tr');

        const word = wordInput.value.trim();
        const meaning = meanInput.value.trim();

        if (!word || !meaning) {
            alert("Lütfen hem kelimeyi hem okunuşunu girin.");
            return;
        }

        const newId = Date.now(); // Unique enough for local
        const newEntry = {
            id: newId,
            word: word,
            meaning: meaning,
            level: this.state.selectedAddLevel
        };

        this.state.customWords.push(newEntry);
        this.saveData();

        alert("Kelime başarıyla eklendi!");

        wordInput.value = '';
        meanInput.value = '';
        wordInput.focus();
    },

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.state.leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Henüz rekor yok.</td></tr>';
            return;
        }

        this.state.leaderboard.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="rank rank-${index + 1}">${index + 1}</span></td>
                <td>${item.name}</td>
                <td style="font-weight:bold; color:var(--accent-gold)">${item.score}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateScoreDisplay() {
        document.getElementById('current-score').textContent = this.state.score;
    },

    filterList() {
        this.state.filters.search = document.getElementById('search-input').value;
        this.renderList();
    },

    setListFilter(type) {
        this.state.filters.showFavsOnly = (type === 'favs');
        if (type === 'favs') {
            document.getElementById('filter-favs').classList.add('active');
            document.getElementById('filter-all').classList.remove('active');
        } else {
            document.getElementById('filter-favs').classList.remove('active');
            document.getElementById('filter-all').classList.add('active');
        }
        this.renderList();
    },

    toggleGameFavorite() {
        if (!this.state.currentWord) return;
        this.toggleFavorite(this.state.currentWord.id);
        const starBtn = document.getElementById('game-star-btn');
        const isFav = this.state.favorites.includes(this.state.currentWord.id);
        if (isFav) {
            starBtn.classList.add('active');
            starBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        } else {
            starBtn.classList.remove('active');
            starBtn.querySelector('svg').setAttribute('fill', 'none');
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    render() {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const activeView = document.getElementById(`view-${this.state.currentView}`);
        if (activeView) activeView.classList.remove('hidden');

        // Mode-specific UI updates
        if (this.state.currentView === 'game') {
            const timerEl = document.getElementById('game-timer');
            const livesEl = document.getElementById('game-lives');

            if (this.state.gameMode === 'rush' || this.state.gameMode === 'favorites') {
                if (timerEl) timerEl.classList.toggle('hidden', this.state.gameMode !== 'rush');
                if (livesEl) livesEl.classList.remove('hidden');
                this.updateTimerUI(); // Ensure text is set
                this.renderLives();   // Ensure hearts are set
            } else {
                if (timerEl) timerEl.classList.add('hidden');
                if (livesEl) livesEl.classList.add('hidden');
            }
        }
    },

    async saveScoreToFirebase() {
        try {
            // Compat Syntax
            await db.collection("scores").add({
                name: this.state.playerName,
                score: this.state.score,
                date: new Date().toLocaleDateString('tr-TR'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Score saved!");
        } catch (e) {
            console.error("Error adding score: ", e);
        }
    },

    // Audio Logic
    initMusic() {
        const storedSetting = localStorage.getItem('music_enabled');
        const storedVol = localStorage.getItem('music_volume');

        // Default true if not set (null), otherwise parse string
        this.state.isMusicPlaying = storedSetting === null ? true : (storedSetting === 'true');
        this.state.musicVolume = storedVol ? parseFloat(storedVol) : 0.3;

        const audio = document.getElementById('bg-music');
        if (audio) {
            audio.volume = this.state.musicVolume;
            // Update slider UI
            const slider = document.getElementById('volume-slider');
            if (slider) slider.value = this.state.musicVolume;

            if (this.state.isMusicPlaying) {
                // Browsers block autoplay, so we need a user interaction first
                // We'll try to play, if it fails, we wait for first click
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Autoplay prevented. Waiting for interaction.");
                        document.addEventListener('click', () => {
                            if (this.state.isMusicPlaying) audio.play();
                        }, { once: true });
                    });
                }
            }
        }
        this.updateMusicUI();
    },

    setVolume(value) {
        this.state.musicVolume = parseFloat(value);
        const audio = document.getElementById('bg-music');
        if (audio) {
            audio.volume = this.state.musicVolume;
        }
        localStorage.setItem('music_volume', this.state.musicVolume);
    },

    toggleMusic() {
        const audio = document.getElementById('bg-music');
        this.state.isMusicPlaying = !this.state.isMusicPlaying;

        if (this.state.isMusicPlaying) {
            audio.play().catch(e => console.log(e));
        } else {
            audio.pause();
        }

        localStorage.setItem('music_enabled', this.state.isMusicPlaying);
        this.updateMusicUI();
    },

    updateMusicUI() {
        const btn = document.getElementById('btn-music');
        if (btn) {
            btn.textContent = this.state.isMusicPlaying ? '🎵' : '🔇';
            btn.style.opacity = this.state.isMusicPlaying ? '1' : '0.5';
        }
    }
};

window.onload = () => app.init();
window.app = app; // Expose to window for HTML onclick handlers
