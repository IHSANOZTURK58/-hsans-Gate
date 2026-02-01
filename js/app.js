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
const auth = firebase.auth();

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
        wallet: 0,
        highScore: 0, // Track Personal Best
        favorites: [],
        customWords: [], // Local legacy
        globalWords: [], // Firebase Global
        selectedAddLevel: 'A1',
        currentWord: null,
        currentOptions: [],
        filters: { search: '', showFavsOnly: false, level: 'all' },

        // Audio State
        isMusicPlaying: false,
        musicVolume: 0.3,

        // New Mode State
        playerName: '',
        selectedAvatar: 1,
        gameMode: 'survival', // 'survival' | 'rush' | 'adventure'
        lives: 3,
        timer: 120, // seconds
        timerInterval: null,
        pendingPasswordAction: null, // 'reset' | 'addWord'

        // Adventure Mode Specific
        currentLevel: 1,
        maxLevel: 1, // Highest Unlocked Level
        levelProgress: 0,
        adventureLives: 3,
        levelWords: []
    },

    init() {
        this.loadData();
        this.setupUI();
        this.initSFX();

        // Start at Landing
        this.state.currentView = 'landing';

        // Force hide gameover modal
        const modal = document.getElementById('view-gameover');
        if (modal) modal.classList.add('hidden');

        this.render();
        this.renderLeaderboard();

        this.geminiService.init();

        // Authenticate
        this.authenticateAndListen();
    },

    openSettings() {
        this.state.currentView = 'settings';
        const input = document.getElementById('settings-api-key');
        if (input) input.value = this.geminiService.apiKey || '';
        this.render();
    },

    saveSettings() {
        const input = document.getElementById('settings-api-key');
        if (input) {
            const key = input.value.trim();
            localStorage.setItem('gemini_api_key', key);
            this.geminiService.apiKey = key;
            alert('Ayarlar kaydedildi! ✅');
        }
    },

    async testGeminiConnection() {
        const input = document.getElementById('settings-api-key');
        const key = input ? input.value.trim() : '';
        if (!key) {
            alert('Lütfen önce bir anahtar girin.');
            return;
        }

        try {
            // Step 1: List Models to find a valid one
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listResponse.json();

            if (!listResponse.ok) {
                const errorMsg = listData.error?.message || 'Model Listesi Alınamadı';
                alert(`Bağlantı Hatası! ❌\n${errorMsg}`);
                return;
            }

            // Find a valid generateContent model (Prioritize 1.5-flash)
            const models = listData.models || [];
            const validModel = models.find(m => m.name.includes('gemini-1.5-flash')) ||
                models.find(m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('flash'));

            if (validModel) {
                // Now test generation with this model
                const modelName = validModel.name.replace('models/', '');
                localStorage.setItem('gemini_valid_model', modelName); // Save for usage

                const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hello" }] }]
                    })
                });

                if (genResponse.ok) {
                    alert(`Bağlantı Başarılı! 🤖✅\nBulunan Model: ${modelName}\nKullanılacak.`);
                    // Update global service immediately
                    if (this.geminiService) {
                        this.geminiService.apiKey = key;
                        this.geminiService.modelName = modelName;
                    }
                } else {
                    const errorData = await genResponse.json();
                    const errMsg = errorData.error?.message || '';

                    if (errMsg.includes('quota') || errMsg.includes('429')) {
                        alert(`⚠️ KOTA DOLDU!\n\nGoogle'ın ücretsiz sürümünde dakikalık sınır var. Çok hızlı deneme yaptınız.\n\nLütfen 1 dakika bekleyip tekrar deneyin.`);
                    } else {
                        alert(`Model Bulundu (${modelName}) ama test başarısız oldu:\n${errMsg}`);
                    }
                }
            } else {
                alert('Uygun bir yapay zeka modeli bulunamadı! ⚠️\nListenizdeki modeller: ' + listData.models?.map(m => m.name).join(', '));
            }

        } catch (e) {
            alert('Ağ Hatası: ' + e.message);
        }
    },

    // ... skip ...

    loadData() {
        const stored = localStorage.getItem('vocab_game_data_v2');
        if (stored) {
            const data = JSON.parse(stored);
            this.state.wallet = data.wallet || 0;
            this.state.highScore = data.highScore || 0;
            this.state.favorites = data.favorites || [];
            this.state.currentLevel = data.currentLevel || 1;
            this.state.maxLevel = data.maxLevel || this.state.currentLevel || 1; // Backwards compat
            this.state.customWords = data.customWords || [];
        } else {
            this.state.wallet = 0;
            this.state.favorites = [];
            this.state.customWords = [];
        }
        // Load Avatar
        const savedAvatar = localStorage.getItem('player_avatar');
        if (savedAvatar) this.state.selectedAvatar = parseInt(savedAvatar);

        this.updateHeaderStats();
        this.updateAvatarUI();
    },

    saveData() {
        const data = {
            wallet: this.state.wallet,
            highScore: this.state.highScore,
            favorites: this.state.favorites,
            currentLevel: this.state.currentLevel,
            maxLevel: this.state.maxLevel, // SAVE MAX
            customWords: this.state.customWords
        };
        localStorage.setItem('vocab_game_data_v2', JSON.stringify(data));
        this.updateHeaderStats();
    },

    setupUI() {
        document.addEventListener('dblclick', (e) => e.preventDefault());

        // Input validation for Name
        // Input validation for Name
        const nameInput = document.getElementById('landing-player-name');
        if (nameInput) {
            nameInput.value = localStorage.getItem('last_player_name') || '';
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.enterDashboard();
            });
        }

        // Global Key Listener for Writing Mode
        document.addEventListener('keydown', (e) => {
            this.handleWritingKeyPress(e);
        });
    },

    // Navigation
    logout() {
        // Show custom logout confirmation modal
        const modal = document.getElementById('logout-confirmation-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeLogoutModal() {
        const modal = document.getElementById('logout-confirmation-modal');
        if (modal) modal.classList.add('hidden');
    },

    confirmLogout() {
        this.closeLogoutModal();
        this.state.isAdmin = false;
        this.state.playerName = null;
        this.showLanding();
    },

    showGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.classList.add('hidden');
    },

    exitToLevelMap() {
        this.closeGameOverModal();
        this.state.currentView = 'level-map';
        this.render();
    },

    retryAdventure() {
        this.closeGameOverModal();
        this.startGame(); // Restart the current game mode
    },

    showLanding() {
        this.state.currentView = 'landing';
        // Reset login state to choices
        const choices = document.getElementById('login-choices');
        const form = document.getElementById('user-login-form');
        if (choices) choices.classList.remove('hidden');
        if (form) form.classList.add('hidden');

        // Hide all header buttons on landing
        const adminBtn = document.querySelector('.header-left .btn-icon[title="Yönetici Paneli"]');
        const logoutBtn = document.querySelector('.header-left .btn-icon[title="Çıkış Yap"]');
        if (adminBtn) adminBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';

        // Reset name display
        const displayName = document.getElementById('display-user-name');
        if (displayName) displayName.textContent = 'Misafir';

        if (this.updateAvatarUI) this.updateAvatarUI();

        this.render();
    },

    showAdmin() {
        this.state.currentView = 'admin';
        this.render();
    },



    checkAdminAuth() {
        // If already admin, go directly to admin panel
        if (this.state.isAdmin) {
            this.showAdmin();
            return;
        }
        this.state.pendingPasswordAction = 'adminAccess';
        this.openPasswordModal("Yönetici Paneline girmek için parolayı girin:");
    },

    showUserLogin() {
        document.getElementById('login-choices').classList.add('hidden');
        document.getElementById('user-login-form').classList.remove('hidden');

        // Sync UI with state
        if (this.selectAvatar) {
            this.selectAvatar(this.state.selectedAvatar);
        }

        // Focus input
        setTimeout(() => document.getElementById('landing-player-name').focus(), 100);
    },

    cancelUserLogin() {
        document.getElementById('user-login-form').classList.add('hidden');
        document.getElementById('login-choices').classList.remove('hidden');
    },

    selectAvatar(id) {
        this.state.selectedAvatar = id;
        // Update selection UI in grid
        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        const selected = document.getElementById(`av-opt-${id}`);
        if (selected) selected.classList.add('selected');

        // Update preview avatar
        const preview = document.getElementById('current-avatar-preview');
        if (preview) {
            const img = preview.querySelector('img');
            if (img) img.src = `assets/avatars/avatar_${id}.png`;
        }

        // Auto-close picker after selection
        const picker = document.getElementById('avatar-picker-grid');
        if (picker && !picker.classList.contains('hidden')) {
            this.toggleAvatarPicker();
        }
    },

    toggleAvatarPicker() {
        const picker = document.getElementById('avatar-picker-grid');
        const text = document.getElementById('avatar-picker-text');

        if (picker) {
            const isHidden = picker.classList.contains('hidden');
            if (isHidden) {
                picker.classList.remove('hidden');
                if (text) text.textContent = 'Kapat';
            } else {
                picker.classList.add('hidden');
                if (text) text.textContent = 'Değiştir';
            }
        }
    },

    toggleProfileMenu() {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    },

    updateAvatarUI() {
        const img = document.getElementById('header-avatar');
        if (img) {
            img.src = `assets/avatars/avatar_${this.state.selectedAvatar}.png`;
            // Only show if logged in (playerName exists)
            img.style.display = this.state.playerName ? 'block' : 'none';
        }
    },

    authenticateAndListen() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in.
                console.log("Auth State: Signed in as", user.uid);
                // We don't necessarily update playerName here, as we use localStorage or manual input
                this.setupFirebaseListener();
            } else {
                // User is signed out.
                console.log("Auth State: Signed out. Signing in anon...");
                auth.signInAnonymously()
                    .catch((error) => {
                        console.error("Auth Error:", error);
                    });
            }
        });

        // Also listen for word updates
        this.setupWordListener();
    },

    openModeSelection() {
        this.state.currentView = 'modes';
        this.render();
        this.renderLeaderboard();
        // Force refresh leaderboard data
        if (this.state.leaderboard.length === 0) {
            // trigger re-fetch if empty? 
            // listener should handle it.
        }
    },

    setupWordListener() {
        db.collection("words")
            .onSnapshot((snapshot) => {
                this.state.globalWords = [];
                snapshot.forEach((doc) => {
                    // Safe handling of data
                    const d = doc.data();
                    if (d.word && d.meaning) {
                        this.state.globalWords.push({
                            id: doc.id, // Use firestore ID
                            word: d.word,
                            meaning: d.meaning,
                            level: d.level || 'A1'
                        });
                    }
                });
                console.log("Global words loaded:", this.state.globalWords.length);
                // Refresh list if open
                if (this.state.currentView === 'list') this.renderList();
            });
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
            }, (error) => {
                console.error("Leaderboard Error:", error);
                const tbody = document.getElementById('leaderboard-body');
                if (tbody) {
                    if (error.code === 'permission-denied') {
                        tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Yetki Hatası (Erişim Reddedildi)</td></tr>';
                    } else {
                        tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Hata: ${error.message}</td></tr>`;
                    }
                }
            });
    },

    getAllWords() {
        const staticData = window.WORD_DATA || [];
        // Combine all sources: Static + Local(Legacy) + Global(Firebase)
        return [...staticData, ...this.state.customWords, ...this.state.globalWords];
    },

    showLevelMap() {
        this.state.currentView = 'level-map';
        this.render();
        this.renderLevelMap();

        // Scroll to current level (after render)
        setTimeout(() => {
            const current = document.querySelector('.level-node.current');
            if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },

    renderLevelMap() {
        const container = document.getElementById('level-map-container');
        if (!container) return;
        container.innerHTML = '';

        const totalLevels = 100;
        let maxUnl = this.state.maxLevel || 1;

        // Admin Bypass
        if (this.state.playerName === 'Yönetici') {
            maxUnl = totalLevels;
        }

        // Configuration
        const nodeSpacing = 80; // Vertical distance
        const amplitude = 75; // Horizontal wave width (Reduced to keep nodes safe from edges)
        const details = [];

        // 1. Calculate Positions (Top-Down: Level 1 at Top)
        for (let i = 1; i <= totalLevels; i++) {
            // Level 1 at Top (y=50), Level 100 at Bottom
            const yPos = (i - 1) * nodeSpacing + 50;

            // X Logic: Sine Wave
            // We need x to be in the range of our viewBox [-200, 200]
            const xOffset = Math.sin((i - 1) * 0.6) * amplitude; // amplitude=100. Range [-100, 100]. Safe within [-200, 200].

            details.push({ level: i, x: xOffset, y: yPos });
        }

        const totalHeight = totalLevels * nodeSpacing + 100;
        container.style.height = `${totalHeight}px`;
        container.style.position = 'relative';

        // 2. Draw SVG Path (Smooth Snake)
        const svgNs = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNs, "svg");
        svg.style.position = "absolute";
        svg.style.top = 0;
        svg.style.left = 0;
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.pointerEvents = "none";

        // Center X is 0 in viewBox. Width is 400.
        // We set preserveAspectRatio to "none" to force the SVG to stretch exactly like our % based divs?
        // NO. "none" distorts the stroke width.
        // We want the SVG X-axis to map 1:1 to the Container X-axis.
        // Container width is unknown (responsive).
        // If we use % for Divs, we are mapping Range to ContainerWidth.
        // We need SVG viewBox width to map to ContainerWidth lineary.
        // If viewBox="-200 0 400 H", it maps -200..200 to 0..clientWidth.
        // This is exactly what we want. "xMidYMin slice" might crop?
        // "none"? No.
        // "xMidYMin meet"? If container is very wide, SVG will be centered and pillarboxed. Divs will stretch 0-100%. ALIGNMENT FAIL.
        // "xMidYMin slice"? If container is narrow, SVG crops sides. Divs shrink 0-100%. ALIGNMENT FAIL.

        // CORRECT APPROACH:
        // Force SVG to scale its width fully to the container, regardless of aspect ratio.
        // preserveAspectRatio="none" is the only way to guarantee -200 maps to 0px and 200 maps to widthpx.
        // BUT it distorts stroke width.
        // ALTERNATIVE: Don't use viewBox width 400. Use 100? 
        // Best: use preserveAspectRatio="none" BUT make the path stroke vector-effect="non-scaling-stroke".

        svg.setAttribute("viewBox", `-200 0 400 ${totalHeight}`);
        svg.setAttribute("preserveAspectRatio", "none");

        // Generate Path Data (Cubic Bezier)
        let pathD = `M ${details[0].x} ${details[0].y}`;

        for (let i = 0; i < details.length - 1; i++) {
            const p1 = details[i];
            const p2 = details[i + 1];
            const cpY = (p2.y - p1.y) / 2;
            const cp1 = { x: p1.x, y: p1.y + cpY };
            const cp2 = { x: p2.x, y: p2.y - cpY };
            pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
        }

        // Background Path
        const pathBg = document.createElementNS(svgNs, "path");
        pathBg.setAttribute("d", pathD);
        pathBg.setAttribute("stroke", "rgba(255,255,255,0.3)"); // White for dark sky visibility
        pathBg.setAttribute("stroke-width", "4"); // Thinner because "none" might scale it up horizontally?
        // vector-effect ensures stroke remains constant pixels!
        pathBg.setAttribute("vector-effect", "non-scaling-stroke");
        pathBg.setAttribute("fill", "none");
        pathBg.setAttribute("stroke-linecap", "round");
        pathBg.setAttribute("stroke-dasharray", "15 15");
        svg.appendChild(pathBg);

        // Unlocked Path
        if (maxUnl > 1) {
            let unlockedD = `M ${details[0].x} ${details[0].y}`;
            const limit = Math.min(maxUnl, totalLevels);

            for (let i = 0; i < limit - 1; i++) {
                const p1 = details[i];
                const p2 = details[i + 1];
                const cpY = (p2.y - p1.y) / 2;
                const cp1 = { x: p1.x, y: p1.y + cpY };
                const cp2 = { x: p2.x, y: p2.y - cpY };
                unlockedD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
            }

            const pathDone = document.createElementNS(svgNs, "path");
            pathDone.setAttribute("d", unlockedD);
            pathDone.setAttribute("stroke", "var(--neon-gold)");
            pathDone.setAttribute("stroke-width", "4");
            pathDone.setAttribute("vector-effect", "non-scaling-stroke");
            pathDone.setAttribute("fill", "none");
            pathDone.setAttribute("stroke-linecap", "round");
            pathDone.style.filter = "drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))";
            svg.appendChild(pathDone);
        }

        container.appendChild(svg);

        // 3. Render Nodes
        details.forEach(pt => {
            const node = document.createElement('div');
            node.className = 'level-node';
            node.textContent = pt.level;

            // Positioning Logic:
            // Map [-200, 200] to [0%, 100%]
            // x=-200 -> 0%
            // x=0 -> 50%
            // x=200 -> 100%
            // Formula: ((x + 200) / 400) * 100

            const leftPercent = ((pt.x + 200) / 400) * 100;

            node.style.position = 'absolute';
            node.style.left = `${leftPercent}%`;
            node.style.top = `${pt.y}px`;
            node.style.transform = 'translate(-50%, -50%)';
            node.style.zIndex = "10";

            // Info for Tooltip
            const difficulty = this.getDifficultyForLevel(pt.level).join('/');
            const infoText = `Seviye ${pt.level} | ${difficulty} | 50 Kelime`;
            node.setAttribute('data-info', infoText);

            // Status
            if (pt.level < maxUnl) {
                node.className += ' unlocked completed';
                node.onclick = () => this.startGame('adventure', pt.level);
                // Checkmark for finished
                node.innerHTML += '<span style="position:absolute; bottom:-10px; right:-5px; font-size:14px; background:white; border-radius:50%; padding:2px;">✅</span>';
            } else if (pt.level === maxUnl) {
                node.className += ' current';
                node.onclick = () => this.startGame('adventure', pt.level);
            } else {
                node.className += ' locked';
                node.innerHTML += '<span style="position:absolute; bottom:-12px; font-size:18px; filter:drop-shadow(0 0 3px rgba(255,255,255,0.5));">🔒</span>';
            }

            container.appendChild(node);
        });
    },

    quitGame() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.isPlaying = false; // Ensure game state is off

        if (this.state.gameMode === 'adventure') {
            this.showLevelMap();
        } else {
            this.openModeSelection();
        }
    },

    closeModeSelection() {
        const modal = document.getElementById('modal-mode-selection');
        if (modal) {
            modal.classList.add('hidden');
        }
    },


    enterDashboard() {
        const nameInput = document.getElementById('landing-player-name');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name) {
            alert("⚠️ Lütfen ismini yaz!");
            if (nameInput) {
                nameInput.focus();
                nameInput.style.border = '2px solid #ef4444';
                setTimeout(() => nameInput.style.border = '', 2000);
            }
            return;
        }

        this.state.playerName = name;
        this.state.isAdmin = false; // Reset admin status on normal login
        localStorage.setItem('last_player_name', name);
        localStorage.setItem('player_avatar', this.state.selectedAvatar);

        // Update Avatar UI
        this.updateAvatarUI();

        // Update header name
        const displayName = document.getElementById('display-user-name');
        if (displayName) displayName.textContent = name;

        // Hide admin button for normal users, Ensure logout is visible
        const adminBtn = document.querySelector('.header-left .btn-icon[title="Yönetici Paneli"]');
        const logoutBtn = document.querySelector('.header-left .btn-icon[title="Çıkış Yap"]');

        if (adminBtn) adminBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        this.showDashboard();
    },

    showDashboard() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.currentView = 'dashboard';
        const modal = document.getElementById('view-gameover');
        if (modal) modal.classList.add('hidden');
        this.render();
    },

    startGame(mode, level = null) {
        // this.closeModeSelection(); -> Removed, as we switch views now
        // Mevcut modu koru veya varsayılan olarak survival kullan
        const targetMode = mode || this.state.gameMode || 'survival';

        if (!this.state.playerName) {
            alert("⚠️ Oturum hatası. Lütfen giriş sayfasına dönün.");
            this.showLanding();
            return;
        }

        // If specific level requested (and valid), use it
        if (targetMode === 'adventure' && level) {
            this.state.currentLevel = level;
        }

        this.state.gameMode = targetMode;
        this.state.score = 0;

        // Apply Background based on Mode
        const gameView = document.getElementById('view-game');
        if (gameView) {
            gameView.classList.remove('bg-survival', 'bg-rush', 'bg-favorites');
            gameView.classList.add(`bg-${targetMode}`);
        }

        if (targetMode === 'rush') {
            this.state.lives = 3;
            this.state.timer = 120; // 2 minutes
            this.startTimer();
        } else if (targetMode === 'favorites') {
            if (this.state.favorites.length < 4) {
                alert("⚠️ Favoriler modunu açmak için en az 4 kelimeyi favorilemelisiniz!");
                this.showDashboard();
                return;
            }
            this.state.lives = 3;
            this.state.timer = 0;
        } else if (targetMode === 'adventure') {
            this.state.timer = 0;
            this.startAdventureLevel();
            // Return early since startAdventureLevel calls nextAdventureQuestion -> render
            // But we need to switch view first
            this.state.currentView = 'game';
            document.getElementById('view-gameover').classList.add('hidden');
            this.updateHeaderStats();
            this.updateScoreDisplay();
            this.render();
            return;
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
            } else if (action === 'adminAccess') {
                this.state.isAdmin = true;
                this.state.playerName = "Yönetici";
                this.state.currentView = 'admin';

                // Show admin button in header since we are now admin
                const adminBtn = document.querySelector('.header-left .btn-icon[title="Yönetici Paneli"]');
                const logoutBtn = document.querySelector('.header-left .btn-icon[title="Çıkış Yap"]');

                if (adminBtn) adminBtn.style.display = 'block';
                if (logoutBtn) logoutBtn.style.display = 'block';

                // Update header name
                const displayName = document.getElementById('display-user-name');
                if (displayName) displayName.textContent = this.state.playerName;

                this.render();
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

    // ADVENTURE MODE LOGIC
    getDifficultyForLevel(lvl) {
        if (lvl <= 20) return ['A1', 'A2'];
        if (lvl <= 50) return ['B1', 'B2'];
        return ['C1', 'C2'];
    },

    getFallbackDifficulty(targetDiffs) {
        // Simple fallback chain: C -> B -> A
        if (targetDiffs.includes('C1') || targetDiffs.includes('C2')) return ['B1', 'B2'];
        if (targetDiffs.includes('B1') || targetDiffs.includes('B2')) return ['A1', 'A2'];
        return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']; // Desperate fallback
    },

    generateLevelWords(level) {
        const requiredCount = 50;
        let pool = this.getAllWords();

        // 0. Deterministic Sort first (to ensure consistency vs browser differences)
        // IDs can be numbers (static) or strings (firebase), so String() cast is required.
        pool.sort((a, b) => String(a.id).localeCompare(String(b.id)));

        let targetDiffs = this.getDifficultyForLevel(level);

        // 1. Filter by target difficulty
        let candidates = pool.filter(w => targetDiffs.includes(w.level));

        // 2. Fallback if insufficient
        if (candidates.length < requiredCount) {
            console.warn(`Level ${level}: Insufficient words in ${targetDiffs}. Found ${candidates.length}. Attempting fallback.`);

            const fallbackDiffs = this.getFallbackDifficulty(targetDiffs);
            const secondaryCandidates = pool.filter(w => fallbackDiffs.includes(w.level));

            // Avoid duplicates
            const existingIds = new Set(candidates.map(w => w.id));
            const distinctSecondary = secondaryCandidates.filter(w => !existingIds.has(w.id));

            // Pseudo-random shuffle for secondary candidates (Seed: Level + 1000)
            this.shuffleArray(distinctSecondary, level + 1000);
            candidates = [...candidates, ...distinctSecondary];
        }

        // 3. Final Fallback (Global Random) if still insufficient
        if (candidates.length < requiredCount) {
            const existingIds = new Set(candidates.map(w => w.id));
            const remaining = pool.filter(w => !existingIds.has(w.id));
            // Seed: Level + 2000
            this.shuffleArray(remaining, level + 2000);
            candidates = [...candidates, ...remaining];
        }

        // 4. Select deterministic 50 (Seed: Level)
        // This guarantees we always pick the SAME 50 words for this level.
        this.shuffleArray(candidates, level);
        const selectedWords = candidates.slice(0, requiredCount);

        // 5. Randomize Order (User Request: "Sırası farklı olabilir")
        // The set is fixed, but the order you face them changes every time.
        this.shuffleArray(selectedWords);

        return selectedWords;
    },

    startAdventureLevel() {
        // Reset states FIRST so UI has correct data to render
        this.state.levelProgress = 0;
        this.state.adventureLives = 3;

        this.updateLevelUI(); // Show Level X / Progress 0/50 / Lives 3
        const backgrounds = [
            'assets/sky-bg.png',
            'assets/game-bg-nature.png',
            'assets/game-bg-abstract.png',
            'assets/game-bg-desert.png',
            'assets/game-bg-galaxy.png',
            'assets/game-bg-geometric.png',
            'assets/game-bg-underwater.png',
            'assets/game-bg-mountains.png',
            'assets/game-bg-city.png',
            'assets/game-bg-paper.png'
        ];

        const bgIndex = (this.state.currentLevel - 1) % backgrounds.length;
        const bgUrl = backgrounds[bgIndex];

        const gameView = document.getElementById('view-game');
        if (gameView) {
            gameView.style.background = `url('${bgUrl}') no-repeat center center`;
            gameView.style.backgroundSize = 'cover';
        }

        // Logic for replaying?
        // If we replay level 5, but our max is 10. `this.state.currentLevel` is 5.
        // We just play it.
        // But `levelProgress` logic relies on fresh start.

        // Always reset progress/lives when starting a fresh level session (even if replay)
        // Unless we are Resuming? (Not implemented)

        // Reset necessary states
        this.state.levelProgress = 0;
        this.state.adventureLives = 3;

        this.state.levelWords = this.generateLevelWords(this.state.currentLevel);

        this.nextAdventureQuestion();
    },

    nextAdventureQuestion() {
        if (this.state.levelProgress >= 50) {
            this.completeLevel();
            return;
        }

        const word = this.state.levelWords[this.state.levelProgress];
        this.prepareGameForWord(word);
    },

    prepareGameForWord(word) {
        this.state.currentWord = word;

        // Distractors from GLOBAL pool or LEVEL pool?
        // Global is better for variety
        let allWords = this.getAllWords();
        const distractors = [];

        while (distractors.length < 3) {
            const idx = Math.floor(Math.random() * allWords.length);
            const w = allWords[idx];
            if (w.id !== word.id && !distractors.some(d => d.id === w.id)) {
                distractors.push(w);
            }
        }

        const options = [word, ...distractors];
        this.shuffleArray(options);
        this.state.currentOptions = options;

        this.renderGameQuestion();
        this.updateLevelUI();
    },

    completeLevel() {
        // Level Up Logic
        this.playSound('correct');
        alert(`🎉 TEBRİKLER! Seviye ${this.state.currentLevel} Tamamlandı!`);

        // Unlock next Level if we are at the max
        if (this.state.currentLevel >= this.state.maxLevel) {
            this.state.maxLevel = this.state.currentLevel + 1;
        }

        this.state.currentLevel++;
        this.state.levelProgress = 0;

        // Save Progress
        this.saveData();

        // Start Next
        this.startAdventureLevel();
    },

    failAdventureLevel() {
        this.playSound('wrong');
        alert(`💀 Seviye ${this.state.currentLevel} Başarısız! Başa dönülüyor...`);
        this.state.levelProgress = 0;
        this.state.adventureLives = 3;

        // We do NOT shuffle here anymore. 
        // startAdventureLevel will re-call generateLevelWords which is now DETERMINISTIC.
        // So the level will restart with exactly the same words in the same order.
        this.startAdventureLevel();
    },

    // Game Logic
    nextQuestion() {
        // Redirect for Adventure Mode
        if (this.state.gameMode === 'adventure') {
            this.nextAdventureQuestion();
            return;
        }

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
            this.playSound('correct'); // SFX

            if (this.state.gameMode === 'adventure') {
                this.state.levelProgress++;
                this.updateLevelUI();
                setTimeout(() => this.nextAdventureQuestion(), 800);
            } else {
                setTimeout(() => this.nextQuestion(), 800);
            }
        } else {
            btnElement.classList.add('wrong');
            this.playSound('wrong'); // SFX
            // Show correct
            allBtns.forEach(b => {
                if (parseInt(b.dataset.id) === this.state.currentWord.id) b.classList.add('correct');
            });

            // Logic Split
            if (this.state.gameMode === 'adventure') {
                this.state.adventureLives--;
                this.updateLevelUI();

                if (this.state.adventureLives <= 0) {
                    setTimeout(() => this.failAdventureLevel(), 1500);
                } else {
                    // Repeat same question or allow to proceed?
                    // "Yanlış cevapta 1 can gider" -> usually you retry or move on?
                    // User said: "Can 0 olursa o level resetlenir (1. kelimeye döner)."
                    // Implicitly, if you have lives, you probably just stay on same word or next?
                    // Standard logic: Show correct, wait, then NEXT word? 
                    // But if we move to next word, we miss 1 progress count?
                    // To get 50/50, we must answer 50 correctly.
                    // If we skip, we can't reach 50.
                    // So we must RETRY the same word or just count it as fail?
                    // "50 kelime bitince" -> implying we go through 50 Qs?
                    // Let's assume we move to next question but don't increment progress?
                    // NO, if we don't increment progress, we never finish.
                    // Let's assume we just retry the same word until correct or lives run out.
                    setTimeout(() => {
                        this.prepareGameForWord(this.state.currentWord); // Retry same word
                    }, 1500);
                }
            } else if (this.state.gameMode === 'rush') {
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

            // Check High Score
            if (this.state.score > this.state.highScore) {
                this.state.highScore = this.state.score;
            }
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

    updateLevelUI() {
        const livesEl = document.getElementById('game-lives');
        const levelInfo = document.getElementById('level-info-container');
        const countInfo = document.getElementById('level-progress-text');
        const bar = document.getElementById('level-progress-fill');

        if (this.state.gameMode === 'adventure') {
            if (livesEl) {
                livesEl.classList.remove('hidden');
                livesEl.textContent = "❤️".repeat(this.state.adventureLives);
            }
            if (levelInfo) {
                levelInfo.classList.remove('hidden');
                document.getElementById('current-level-display').textContent = this.state.currentLevel;
            }
            if (countInfo) countInfo.textContent = `${this.state.levelProgress} / 50`;
            if (bar) bar.style.width = `${(this.state.levelProgress / 50) * 100}%`;
        } else {
            if (levelInfo) levelInfo.classList.add('hidden');
        }
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
        if (this.state.filters.level && this.state.filters.level !== 'all') {
            filtered = filtered.filter(w => w.level === this.state.filters.level);
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
        this.updateDashboardStats();
    },

    updateDashboardStats() {
        const favCount = document.getElementById('dash-fav-count');
        const highScore = document.getElementById('dash-high-score');

        if (favCount) favCount.textContent = `⭐ ${this.state.favorites.length}`;
        if (highScore) highScore.textContent = `🏆 ${this.state.highScore}`;
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

    async saveNewWord() {
        const wordInput = document.getElementById('new-word-en');
        const meanInput = document.getElementById('new-word-tr');

        const word = wordInput.value.trim();
        const meaning = meanInput.value.trim();

        if (!word || !meaning) {
            alert("Lütfen hem kelimeyi hem okunuşunu girin.");
            return;
        }

        try {
            await db.collection("words").add({
                word: word,
                meaning: meaning,
                level: this.state.selectedAddLevel,
                addedBy: this.state.playerName || 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("✅ Kelime Global Veritabanına Eklendi! (Herkes görecek)");

            wordInput.value = '';
            meanInput.value = '';
            wordInput.focus();
        } catch (e) {
            console.error("Error adding word:", e);
            alert("Hata: " + e.message);
        }
    },

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.state.leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Henüz rekor yok.</td></tr>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        this.state.leaderboard.forEach((item, index) => {
            let rankDisplay = index + 1;
            if (index < 3) {
                rankDisplay = `<span style="font-size:1.2rem">${medals[index]}</span>`;
            } else {
                rankDisplay = `<span class="rank rank-${index + 1}">${index + 1}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rankDisplay}</td>
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

    setLevelFilter(lvl, btn) {
        this.state.filters.level = lvl;

        // Update UI
        const chips = document.querySelectorAll('.level-chip');
        chips.forEach(c => c.classList.remove('active'));
        if (btn) btn.classList.add('active');

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

    // Updated Shuffle: Supports Optional Seed for Deterministic Levels
    shuffleArray(array, seed = null) {
        // Simple seeded PRNG (Mulberry32)
        let random = Math.random; // Default
        if (seed !== null) {
            let s = seed + 0x6D2B79F5;
            random = () => {
                let t = s += 0x6D2B79F5;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    render() {
        // Force close overlays
        document.getElementById('view-gameover').classList.add('hidden');
        document.getElementById('view-password-modal').classList.add('hidden');

        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const activeView = document.getElementById(`view-${this.state.currentView}`);
        if (activeView) activeView.classList.remove('hidden');

        // Mode-specific UI updates
        if (this.state.currentView === 'game') {
            const timerEl = document.getElementById('game-timer');
            const livesEl = document.getElementById('game-lives');

            if (this.state.gameMode === 'rush' || this.state.gameMode === 'favorites' || this.state.gameMode === 'adventure') {
                if (timerEl) timerEl.classList.toggle('hidden', this.state.gameMode !== 'rush');
                if (livesEl) {
                    livesEl.classList.remove('hidden');
                    // For Adventure, updateLevelUI handles text, but we ensure it's visible here.
                    // For others, renderLives handles it.
                    if (this.state.gameMode !== 'adventure') this.renderLives();
                    else livesEl.textContent = "❤️".repeat(this.state.adventureLives || 3);
                }
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
            alert("Skor kaydedilemedi: " + e.message);
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
    },

    // --- SFX MANAGER (Web Audio API) ---
    initSFX() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.sfxCtx = new AudioContext();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    },

    playSound(type) {
        if (!this.sfxCtx) return;

        // Resume context if suspended (browser policy)
        if (this.sfxCtx.state === 'suspended') {
            this.sfxCtx.resume();
        }

        const osc = this.sfxCtx.createOscillator();
        const gainNode = this.sfxCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.sfxCtx.destination);

        if (type === 'correct') {
            // Ding! (Sine wave 600Hz -> 800Hz)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, this.sfxCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, this.sfxCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.sfxCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.sfxCtx.currentTime + 0.5);

            osc.start();
            osc.stop(this.sfxCtx.currentTime + 0.5);
        } else if (type === 'wrong') {
            // Buzz (Sawtooth 150Hz -> 100Hz)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.sfxCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, this.sfxCtx.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0.3, this.sfxCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.sfxCtx.currentTime + 0.3);

            osc.start();
            osc.stop(this.sfxCtx.currentTime + 0.3);
        }
    },

    speakCurrentWord() {
        let textToSpeak = null;

        if (this.state.currentView === 'writing') {
            if (this.state.currentWritingWord && this.state.currentWritingWord.word) {
                textToSpeak = this.state.currentWritingWord.word;
            }
        } else {
            // Default to normal game
            if (this.state.currentWord && this.state.currentWord.word) {
                textToSpeak = this.state.currentWord.word;
            }
        }

        if (!textToSpeak) return;

        // Cancel any ongoing speech to prevent queueing
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US'; // English pronunciation
        utterance.rate = 0.8; // Slightly slower for clear pronunciation

        window.speechSynthesis.speak(utterance);
    },

    // --- GEMINI AI SERVICE ---
    geminiService: {
        apiKey: null,

        modelName: 'gemini-1.5-flash',

        init() {
            this.apiKey = localStorage.getItem('gemini_api_key');
            const savedModel = localStorage.getItem('gemini_valid_model');
            if (savedModel) this.modelName = savedModel;
        },

        async generateSentence() {
            if (!this.apiKey) return null;

            const topics = ['Daily Life', 'Travel', 'Food', 'Work', 'School', 'Hobby', 'Family', 'Weather', 'Technology', 'Nature', 'Health', 'Shopping'];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            const complexity = Math.random() > 0.5 ? 'A1-A2 (Simple)' : 'B1-B2 (Intermediate)';

            const prompt = `Generate a unique, simple English sentence (A1-B1 level) related to topic "${randomTopic}". 
            Also provide its correct Turkish translation.
            Return ONLY a pure JSON object with keys 'en' (the sentence) and 'tr' (meaning). 
            No markdown.`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();
                if (data.candidates && data.candidates[0].content) {
                    let text = data.candidates[0].content.parts[0].text;
                    // Clean markdown code blocks if present
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(text);
                }
            } catch (e) {
                console.error("Gemini Gen Error:", e);
            }
            return null;
        },

        async checkAnswer(source, input) {
            if (!this.apiKey) return null;

            // Source is EN (e.g. "I am happy")
            // Input is TR (e.g. "Ben mutluyum")

            const prompt = `
            Act as a supportive Turkish language tutor.
            
            English Source: "${source.en}"
            User's Translation: "${input}"
            
            Task: Evaluation.
            Rules:
            1. Be FLEXIBLE. Accept synonyms (e.g., "name"="ad"="isim"), dropped pronouns, and minor typos.
            2. If the meaning is mostly preserved, mark it as TRUE.
            3. IGNORE punctuation and casing.
            
            Return ONLY a pure JSON object (no markdown):
            {
                "isCorrect": boolean,
                "feedback": "If Correct: Praise enthusiastically in Turkish. IF WRONG: Explain the specific mistake in Turkish (e.g., 'X kelimesi yerine Y kullanmalısın' or 'Gramer hatası var'). Do NOT just give the answer, explain the WHY."
            }`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();
                if (data.candidates && data.candidates[0].content) {
                    let text = data.candidates[0].content.parts[0].text;
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(text);
                }
            } catch (e) {
                console.error("Gemini Check Error:", e);
            }
            return null;
        }
    },

    // --- WRITING MODULE (New) ---
    openWritingModes() {
        this.state.currentView = 'writing-modes';
        this.render();
    },

    startWritingMode() {
        // SCRAMBLE MODE (Legacy)
        if (!this.state.playerName) {
            alert("⚠️ Önce giriş yapmalısınız.");
            this.showLanding();
            return;
        }
        this.state.currentView = 'writing';
        this.state.writingScore = 0;
        this.render();
        this.nextWritingQuestion();
    },

    startWritingInputMode() {
        // DIRECT INPUT MODE
        if (!this.state.playerName) {
            alert("⚠️ Önce giriş yapmalısınız.");
            this.showLanding();
            return;
        }
        this.state.currentView = 'writing-input';
        this.state.writingScore = 0; // Share score variable or separate? Let's use same state ref but different ID
        this.render();
        this.nextWritingInputQuestion();
    },

    async nextWritingInputQuestion() {
        // Clear Inputs
        const input = document.getElementById('writing-direct-input');
        input.value = '';
        input.disabled = true;
        input.placeholder = 'Soruyu hazırlıyorum...';

        document.getElementById('input-target-meaning').textContent = '...';

        let sentenceData = null;

        // Try AI First
        if (this.geminiService.apiKey) {
            sentenceData = await this.geminiService.generateSentence();
        }

        // Fallback
        if (!sentenceData) {
            const allSentences = this.getSentences();
            sentenceData = allSentences[Math.floor(Math.random() * allSentences.length)];
        }

        this.state.currentWritingSentence = sentenceData;

        // Render Question (English)
        document.getElementById('writing-input-score').textContent = this.state.writingScore;
        // Display ENGLISH to translate to Turkish
        document.getElementById('input-target-meaning').textContent = sentenceData.en;

        input.disabled = false;
        input.placeholder = 'Türkçe çevirisi nedir?';
        input.focus();

        // Check Button Reset
        const btn = document.getElementById('btn-check-answer');
        if (btn) {
            btn.disabled = false;
            btn.textContent = "KONTROL ET";
            btn.onclick = () => app.checkWritingInputAnswer();
            btn.style.background = 'white';
            btn.style.color = 'black';
        }
    },

    updateChat(sender, msg) {
        const chatContainer = document.getElementById('ai-chat-messages');
        if (!chatContainer) return;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = msg;
        chatContainer.appendChild(bubble); // Append to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight; // Auto scroll
    },

    async checkWritingInputAnswer() {
        const input = document.getElementById('writing-direct-input');
        const val = input.value.trim();

        if (!val) return;

        // Put user message in chat
        this.updateChat('user', val);

        input.disabled = true;
        const btn = document.getElementById('btn-check-answer');
        btn.textContent = "KONTROL EDİLİYOR...";
        btn.disabled = true;

        let isCorrect = false;
        let feedback = '';

        // AI Check
        // Hybrid Check: Try AI -> Fallback to Local
        let result = null;
        if (this.geminiService.apiKey) {
            try {
                result = await this.geminiService.checkAnswer(this.state.currentWritingSentence, val);
            } catch (err) {
                console.error("AI Check failed, falling back to local:", err);
            }
        }

        if (result) {
            // AI Success
            isCorrect = result.isCorrect;
            feedback = result.feedback;
        } else {
            // Fallback: Local match (Offline or API Fail)
            const cleanVal = val.toLowerCase().replace(/[.,!?'"]/g, '').trim();
            const cleanTarget = this.state.currentWritingSentence.tr.toLowerCase().replace(/[.,!?'"]/g, '').trim();

            // Allow exact match or if user's input is contained in target (vice versa for safety)
            isCorrect = cleanVal === cleanTarget || cleanTarget.includes(cleanVal);

            if (isCorrect) {
                feedback = "Güzel! (Yapay zeka çevrimdışı ama cevap doğru.)";
            } else {
                feedback = "Eşleşmedi. (⚠️ Yapay zeka şu an çevrimdışı olduğu için hatayı detaylı açıklayamıyorum. Sadece kelime eşleşmesine bakabildim.)";
            }
        }

        if (isCorrect) {
            this.playSound('correct');
            this.state.writingScore += 10;
            document.getElementById('writing-input-score').textContent = this.state.writingScore;

            this.updateChat('ai', `✅ <b>Doğru!</b> ${feedback}`);

            btn.textContent = "DEVAM ET ->";
            btn.disabled = false;
            btn.style.background = '#22c55e';
            btn.style.color = 'white';
            btn.onclick = () => app.nextWritingInputQuestion();

        } else {
            this.playSound('wrong');
            this.updateChat('ai', `❌ <b>Yanlış.</b> ${feedback}<br><br>Doğru Çeviri: <i>${this.state.currentWritingSentence.tr}</i>`);

            btn.textContent = "DEVAM ET ->";
            btn.disabled = false;
            btn.style.background = '#ef4444';
            btn.style.color = 'white';
            btn.onclick = () => app.nextWritingInputQuestion();
        }
    },

    passWritingQuestion() {
        this.updateChat('user', 'Pas geçtim.');
        this.updateChat('ai', `Sorun değil! Cevap şuydu: <b>${this.state.currentWritingSentence.tr}</b>`);
        this.nextWritingInputQuestion();
    },

    giveUpWritingInput() {
        this.updateChat('user', 'Pes ediyorum 🏳️');
        this.updateChat('ai', `Pes etmek yok! 💪 Doğrusu buydu:<br><b>${this.state.currentWritingSentence.tr}</b>`);

        const btn = document.getElementById('btn-check-answer');
        btn.textContent = "DEVAM ET ->";
        btn.onclick = () => app.nextWritingInputQuestion();
    },
    getSentences() {
        return [
            { en: "I am ready", tr: "Hazırım" },
            { en: "See you later", tr: "Sonra görüşürüz" },
            { en: "What is your name?", tr: "Adın ne?" },
            { en: "I usually drink coffee in the morning", tr: "Sabahları genellikle kahve içerim" },
            { en: "She is reading a book in the garden", tr: "Bahçede kitap okuyor" },
            { en: "They are playing football in the park", tr: "Parkta futbol oynuyorlar" },
            { en: "I saw my friends while walking down the road", tr: "Yolda yürürken arkadaşlarımı gördüm" },
            { en: "This car is faster than yours", tr: "Bu araba seninkinden daha hızlı" },
            { en: "I have never been to London", tr: "Londra'ya hiç gitmedim" },
            { en: "If I were you, I would accept the offer", tr: "Senin yerinde olsam teklifi kabul ederdim" },
            { en: "It is raining heavily outside", tr: "Dışarıda sağanak yağmur yağıyor" },
            { en: "Can you help me with my homework?", tr: "Ev ödevime yardım edebilir misin?" },
            { en: "I was sleeping when you called", tr: "Sen aradığında uyuyordum" },
            { en: "We should go to the cinema tonight", tr: "Bu gece sinemaya gitmeliyiz" },
            { en: "My brother works as a doctor", tr: "Kardeşim doktor olarak çalışıyor" },
            { en: "Have you ever seen a ghost?", tr: "Hiç hayalet gördün mü?" },
            { en: "I will call you valid as soon as I arrive", tr: "Varır varmaz seni arayacağım" },
            { en: "She looks like her mother", tr: "Annesine benziyor" },
            { en: "I prefer tea to coffee", tr: "Çayı kahveye tercih ederim" },
            { en: "The movie was so boring that I fell asleep", tr: "Film o kadar sıkıcıydı ki uyuyakaldım" },
            { en: "You must finish your work before you leave", tr: "Çıkmadan önce işini bitirmelisin" },
            { en: "I used to play tennis when I was young", tr: "Gençken tenis oynardım" },
            { en: "Do you know where the station is?", tr: "İstasyonun nerede olduğunu biliyor musun?" },
            { en: "I am looking forward to seeing you", tr: "Seni görmeyi dört gözle bekliyorum" },
            { en: "It takes two hours to get there by car", tr: "Arabayla oraya varmak iki saat sürer" },
            { en: "I wish I had studied harder", tr: "Keşke daha sıkı çalışsaydım" },
            { en: "Despite the rain, we went out", tr: "Yağmura rağmen dışarı çıktık" },
            { en: "He is the smartest student in the class", tr: "Sınıftaki en zeki öğrenci o" },
            { en: "Let's meet at the cafe at 5 o'clock", tr: "Saat 5'te kafede buluşalım" },
            { en: "I ran out of money", tr: "Param bitti" }
        ];
    },

    nextWritingQuestion() {
        const allWords = this.getAllWords();
        if (allWords.length === 0) return;

        // Pick Random
        const wordData = allWords[Math.floor(Math.random() * allWords.length)];
        this.state.currentWritingWord = wordData;
        this.state.writingInput = Array(wordData.word.length).fill(null); // Empty slots

        // Prepare Pool: Scramble letters
        const letters = wordData.word.toUpperCase().split('');
        this.shuffleArray(letters); // Random scramble

        // Map letters to unique objects to track usage (handle duplicate letters like E, E)
        this.state.writingPool = letters.map((char, index) => ({
            id: index,
            char: char,
            used: false
        }));

        this.renderWritingBoard();
    },

    renderWritingBoard() {
        const wordData = this.state.currentWritingWord;

        // Update Header
        document.getElementById('writing-score').textContent = this.state.writingScore;
        document.getElementById('writing-target-meaning').textContent = wordData.meaning;
        document.getElementById('writing-feedback').textContent = '';

        // Render Slots
        const slotsContainer = document.getElementById('writing-slots');
        slotsContainer.innerHTML = '';
        this.state.writingInput.forEach((char, idx) => {
            const slot = document.createElement('div');
            slot.className = `writing-slot ${char ? 'filled' : ''}`;
            slot.textContent = char ? char.char : '';
            slot.onclick = () => this.handleSlotClick(idx);
            slotsContainer.appendChild(slot);
        });

        // Render Pool
        const poolContainer = document.getElementById('writing-pool');
        poolContainer.innerHTML = '';
        this.state.writingPool.forEach((item) => {
            const btn = document.createElement('div');
            btn.className = `letter-tile ${item.used ? 'used' : ''}`;
            btn.textContent = item.char;
            btn.onclick = () => this.handleLetterClick(item);
            poolContainer.appendChild(btn);
        });
    },

    handleLetterClick(item) {
        if (item.used) return;

        // Find first empty slot
        const emptyIndex = this.state.writingInput.findIndex(val => val === null);
        if (emptyIndex === -1) return; // Full

        // Place letter
        this.state.writingInput[emptyIndex] = item;
        item.used = true;

        this.playSound('click'); // Optional click sound if exists, or silence
        this.renderWritingBoard();

        // Auto-check if full?
        if (emptyIndex === this.state.writingInput.length - 1) {
            // Check immediately or wait for button? 
            // Better wait for button or auto-check? Let's wait for button or auto-check.
            // Let's auto-check for smooth flow?
            // this.checkWritingAnswer();
        }
    },

    handleSlotClick(index) {
        const item = this.state.writingInput[index];
        if (!item) return;

        // Return to pool
        item.used = false;
        this.state.writingInput[index] = null;
        this.renderWritingBoard();
    },

    handleWritingKeyPress(e) {
        if (this.state.currentView === 'writing-input') {
            if (e.key === 'Enter') {
                // If button is "Devam Et", trigger it
                const btn = document.querySelector('#view-writing-input .btn-primary');
                if (btn && btn.textContent.includes('Devam')) {
                    this.nextWritingInputQuestion();
                } else {
                    this.checkWritingInputAnswer();
                }
            }
            return;
        }

        if (this.state.currentView !== 'writing') return;

        // Enter: Check Answer
        if (e.key === 'Enter') {
            this.checkWritingAnswer();
            return;
        }

        // Backspace: Delete last character
        if (e.key === 'Backspace') {
            for (let i = this.state.writingInput.length - 1; i >= 0; i--) {
                if (this.state.writingInput[i] !== null) {
                    this.handleSlotClick(i);
                    break;
                }
            }
            return;
        }

        // Letter Input
        const key = e.key.toLowerCase();
        // Allow Turkish characters too
        if (key.length === 1 && /[a-zçğıöşü]/i.test(key)) {
            const item = this.state.writingPool.find(
                p => !p.used && p.char.toLowerCase() === key
            );

            if (item) {
                this.handleLetterClick(item);
            }
        }
    },

    clearWritingSlots() {
        this.state.writingInput.fill(null);
        this.state.writingPool.forEach(i => i.used = false);
        this.renderWritingBoard();
    },

    checkWritingAnswer() {
        if (this.state.writingInput.includes(null)) {
            // Incomplete
            const fb = document.getElementById('writing-feedback');
            fb.textContent = "Kelime tamamlanmadı!";
            fb.style.color = "#ef4444";
            setTimeout(() => fb.textContent = '', 1500);
            return;
        }

        const formedWord = this.state.writingInput.map(i => i.char).join('');
        const targetWord = this.state.currentWritingWord.word.toUpperCase();

        if (formedWord === targetWord) {
            // Correct
            this.playSound('correct');
            this.state.writingScore += 10;

            const fb = document.getElementById('writing-feedback');
            fb.textContent = "DOĞRU! 🎉";
            fb.style.color = "#22c55e";

            setTimeout(() => {
                this.nextWritingQuestion();
            }, 1000);

        } else {
            // Wrong
            this.playSound('wrong');
            const fb = document.getElementById('writing-feedback');
            fb.textContent = "YANLIŞ! Tekrar dene.";
            fb.style.color = "#ef4444";
        }
    }
};

window.onload = () => app.init();
window.app = app; // Expose to window for HTML onclick handlers
