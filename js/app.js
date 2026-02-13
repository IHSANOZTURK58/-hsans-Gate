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
window.db = db; // Expose for debugging
window.auth = auth;

const app = {
    // Config
    POINTS_PER_QUESTION: 5,
    MAX_LEADERBOARD: 5, // Request: Limit to top 5

    state: {
        currentView: 'menu',
        score: 0,
        leaderboard: [], // Global Data

        highScore: 0, // Track Personal Best
        favorites: [],
        customWords: [], // Local legacy
        globalWords: [], // Firebase Global
        selectedAddLevel: 'A1',
        currentWord: null,
        currentOptions: [],
        filters: { search: '', showFavsOnly: false, level: 'all' },

        // Scoring
        sessionScore: 0, // Reset every game
        rushHighScore: 0, // Best Rush Mode Score

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
        levelWords: [],

        // Writing Input Settings
        writingDirection: 'EN_TR', // 'EN_TR' (Default) or 'TR_EN'

        // Navigation History
        previousView: null,

        // --- NEW: LISTENING MODE STATE ---
        listening: {
            sentences: [],
            currentSentence: null,
            currentGapIndex: 0,
            score: 0,
            currentIndex: 0,
            // Voice Preference: 'andrew', 'ava', 'emma', 'brian', 'jenny', 'guy'
            voicePreference: 'andrew',
            selectedVoice: null
        }
    },

    init() {
        this.loadData();
        this.setupUI();
        this.initSFX();

        // OPTIMIZATION: Check cache to skip Landing Page
        const cachedName = localStorage.getItem('cached_username');
        if (cachedName) {
            this.state.currentView = 'dashboard';
            this.state.playerName = cachedName;
            // Update Headers immediately
            const headerName = document.getElementById('display-user-name-header');
            if (headerName) headerName.textContent = cachedName;
        } else {
            // Start at Landing if no cache
            this.state.currentView = 'landing';
        }

        // Force hide gameover modal
        const modal = document.getElementById('view-gameover');
        if (modal) modal.classList.add('hidden');

        this.render();
        this.renderLeaderboard();

        this.geminiService.init();


        // Authenticate
        this.authenticateAndListen();

        // Audio Warmup (Wake up server)
        if (window.ttsManager) {
            window.ttsManager.warmup();
        }
    },




    loadData() {
        const storageKey = this.state.isAdmin ? 'vocab_game_admin_data' : 'vocab_game_data_v2';
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            const data = JSON.parse(stored);
            this.state.highScore = data.highScore || 0;
            this.state.rushHighScore = data.rushHighScore || 0;

            // If we have a cached username and NOT admin, we expect cloud data
            if (localStorage.getItem('cached_username') && !this.state.isAdmin) {
                this.state.score = 0;
            } else {
                this.state.score = data.score || 0;
            }

            this.state.favorites = data.favorites || [];
            this.state.currentLevel = data.currentLevel || 1;
            this.state.maxLevel = data.maxLevel || this.state.currentLevel || 1;
            this.state.customWords = data.customWords || [];
        } else {
            // Fresh state for new sessions (including first-time admin)
            this.state.score = 0;
            this.state.highScore = 0;
            this.state.currentLevel = 1;
            this.state.maxLevel = 1;
            this.state.favorites = [];
            this.state.customWords = [];
        }

        // Load Avatar
        const savedAvatar = localStorage.getItem(this.state.isAdmin ? 'admin_avatar' : 'player_avatar');
        if (savedAvatar) this.state.selectedAvatar = parseInt(savedAvatar);

        // Merge Basic Vocabulary
        if (window.BASIC_VOCAB && window.WORD_DATA) {
            if (!window.WORD_DATA._merged) {
                window.WORD_DATA = window.WORD_DATA.concat(window.BASIC_VOCAB);
                window.WORD_DATA._merged = true;
                console.log("Basic Vocabulary Merged:", window.BASIC_VOCAB.length);
            }
        }

        // Load Persistent Voice Preference
        const savedVoice = localStorage.getItem('voice_preference');
        if (savedVoice) {
            this.state.listening.voicePreference = savedVoice;
        }

        this.updateHeaderStats();
        this.updateAvatarUI();
    },

    saveData() {
        const storageKey = this.state.isAdmin ? 'vocab_game_admin_data' : 'vocab_game_data_v2';
        const data = {
            highScore: this.state.highScore,
            score: this.state.score, // Save Total Score
            favorites: this.state.favorites,
            currentLevel: this.state.currentLevel,
            maxLevel: this.state.maxLevel, // SAVE MAX
            rushHighScore: this.state.rushHighScore, // SAVE RUSH
            customWords: this.state.customWords
        };
        localStorage.setItem(storageKey, JSON.stringify(data));

        // Save Voice Preference Globally
        if (this.state.listening.voicePreference) {
            localStorage.setItem('voice_preference', this.state.listening.voicePreference);
        }

        if (this.state.isAdmin) {
            localStorage.setItem('admin_avatar', this.state.selectedAvatar);
        }

        this.updateHeaderStats();

        // Debounced Firebase sync - fires 3s after last save call (prevents spam)
        if (!this.state.isAdmin && this.saveGlobalScore) {
            if (this._saveDebounce) clearTimeout(this._saveDebounce);
            this._saveDebounce = setTimeout(() => this.saveGlobalScore(), 3000);
        }
    },

    saveGlobalScore() {
        if (this.state.isAdmin) return;
        const user = firebase.auth().currentUser;
        if (user) {
            // Updated: Source of Truth (Progress/Cupa)
            db.collection('users').doc(user.uid).set({
                score: this.state.score,
                username: this.state.playerName || user.displayName,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(e => console.error('Users write failed:', e));

            // CRITICAL: We NO LONGER update 'scores' collection here.
            // 'scores' is only for Rush Mode (Acele Modu) records.
        }
    },

    setupUI() {
        document.addEventListener('dblclick', (e) => e.preventDefault());

        // Input validation for Name
        // Input validation for Name
        const nameInput = document.getElementById('landing-player-name');
        if (nameInput) {
            // value is empty by default, only fill if explicitly desired (removing auto-fill for security)
            nameInput.value = '';
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

    async confirmLogout() {
        this.closeLogoutModal();
        this.state.isAdmin = false;
        this.state.playerName = null;

        // Clear Local Session Data to prevent auto-login
        localStorage.removeItem('last_player_name');
        localStorage.removeItem('player_avatar');
        localStorage.removeItem('cached_username'); // CRITICAL: This was causing auto-login

        // We keep 'gemini_api_key' and 'gemini_model' for convenience.

        try {
            await firebase.auth().signOut();
            console.log("User signed out successfully.");
        } catch (e) {
            console.error("SignOut Error:", e);
        }

        this.showLanding();
        window.location.reload(); // Force reload to clear memory state completely
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
        const wasAdmin = this.state.isAdmin;
        this.state.isAdmin = false; // Reset admin status on landing
        this.state.currentView = 'landing';

        // If we were in an admin session, reload regular data
        if (wasAdmin) {
            console.log("Exiting Admin Session, restoring regular data...");
            this.loadData();
        }

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

        // Refresh stats/ui
        this.updateHeaderStats();
        this.updateAvatarUI();

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
        auth.onAuthStateChanged(async (user) => {
            if (user && !user.isAnonymous) {
                // Real User Logged In
                console.log("Logged in as:", user.email);

                // OPTIMIZATION: Check for cached username to load instantly
                const cachedName = localStorage.getItem('cached_username');
                if (cachedName) {
                    this.state.playerName = cachedName;
                    const headerName = document.getElementById('display-user-name-header');
                    if (headerName) headerName.textContent = cachedName;

                    if (this.state.currentView === 'menu' || this.state.currentView === 'landing') {
                        this.enterDashboard();
                    }
                }

                // Load User Profile (Async - Background Update)
                let username = user.displayName;

                // If displayName is missing, fetch from DB
                if (!username) {
                    try {
                        const doc = await db.collection('users').doc(user.uid).get();
                        if (doc.exists) username = doc.data().username;
                    } catch (e) {
                        console.error("Profile fetch error", e);
                    }
                }

                if (username) {
                    this.state.playerName = username;
                    localStorage.setItem('cached_username', username); // Save for next time

                    // Update UI Names
                    const headerName = document.getElementById('display-user-name-header');
                    const welcomeName = document.getElementById('display-user-name-welcome');
                    if (headerName) headerName.textContent = username;
                    if (welcomeName) welcomeName.textContent = username;

                    // Auto-enter dashboard if on landing page and not already entered via cache
                    if (!cachedName && (this.state.currentView === 'menu' || this.state.currentView === 'landing')) {
                        this.enterDashboard();
                    }

                    // Setup Listeners
                    this.setupFirebaseListener();

                    // SYNC: Fetch from both 'users' (profile) and 'scores' (leaderboard)
                    // Use the HIGHER value to heal any discrepancies
                    try {
                        console.log("DEBUG: Attempting to fetch scores for UID:", user.uid);
                        const [userDoc, scoreDoc] = await Promise.all([
                            db.collection('users').doc(user.uid).get(),
                            db.collection('scores').doc(user.uid).get()
                        ]);

                        let finalScore = 0;
                        console.log("DEBUG: Profile Score:", userDoc.exists ? userDoc.data().score : 'N/A');
                        console.log("DEBUG: Leaderboard Score:", scoreDoc.exists ? scoreDoc.data().score : 'N/A');

                        if (userDoc.exists && userDoc.data().score) finalScore = Math.max(finalScore, Number(userDoc.data().score) || 0);
                        if (scoreDoc.exists && scoreDoc.data().score) finalScore = Math.max(finalScore, Number(scoreDoc.data().score) || 0);

                        console.log("DEBUG: Calculated Final Score:", finalScore);

                        if (finalScore > 0) {
                            console.log(`Synced Score: ${finalScore} (Healed from Profile/Leaderboard)`);
                            this.state.score = finalScore;
                            this.updateHeaderStats();

                            // If profile was stale (e.g. 5 vs 8), update it now
                            if (userDoc.exists && userDoc.data().score < finalScore) {
                                this.saveGlobalScore();
                            }
                        }
                    } catch (e) {
                        console.error("Score sync error:", e);
                    }
                }


            } else {
                console.log("No active user. Waiting for login.");
                // Reset header and welcome even if no user
                const headerName = document.getElementById('display-user-name-header');
                const welcomeName = document.getElementById('display-user-name-welcome');
                if (headerName) headerName.textContent = 'Misafir';
                if (welcomeName) welcomeName.textContent = 'Misafir';

                // Clear state
                this.state.playerName = null;
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
        // Read from 'scores' collection for Rush Mode Leaderboard (Modes View)
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

        const allWords = this.getAllWords();
        const totalLevels = Math.max(1, Math.floor(allWords.length / 50)); // Dynamically use all words (50 per lvl)
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
        // If not logged in, show Login Modal
        if (!auth.currentUser || auth.currentUser.isAnonymous) {
            this.openLoginModal();
        } else {
            this.showDashboard();
        }
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
        this.state.sessionScore = 0; // Reset session score for every game
        // this.state.score = 0; // REMOVED: Score is now persistent/cumulative

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
        this.updateLevelUI();
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

    resetTrophyLeaderboard() {
        this.state.pendingPasswordAction = 'resetTrophy';
        this.openPasswordModal("Kupa tablosunu sıfırlamak için parolayı girin:");
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
            } else if (action === 'resetTrophy') {
                await this.performTrophyReset();
            } else if (action === 'addWord') {
                this.performShowAddWord();
            } else if (action === 'adminAccess') {
                // ISOLATE ADMIN SESSION
                console.log("Switching to Admin Session...");
                this.state.isAdmin = true;
                this.state.playerName = "Yönetici";
                this.state.currentView = 'admin';

                // Load Admin-specific data (Trophies: 0 if first time)
                this.loadData();

                // Update UI Names for Admin
                const headerName = document.getElementById('display-user-name-header');
                const welcomeName = document.getElementById('display-user-name-welcome');
                if (headerName) headerName.textContent = this.state.playerName;
                if (welcomeName) welcomeName.textContent = this.state.playerName;

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
        if (!confirm("⚠️ DİKKAT: Bu işlem ACELE MODU rekor listesini temizleyecek!\n\nDevam etmek istiyor musun?")) return;

        try {
            // Get all scores
            const snapshot = await db.collection("scores").get();

            // Batch delete
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert("✅ Acele Modu Rekor Tablosu Başarıyla Temizlendi!");
        } catch (e) {
            console.error("Error clearing scores: ", e);
            alert("Hata oluştu: " + e.message);
        }
    },

    async performTrophyReset() {
        if (!confirm("⚠️ DİKKAT: Bu işlem TÜM KUPA LİSTESİNİ ve TÜM OYUNCU PUANLARI ile REKORLARI sıfırlayacak!\n\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?")) return;

        try {
            const batch = db.batch();

            // 1. Clear Acele Modu Records
            const scoresSnapshot = await db.collection("scores").get();
            scoresSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 2. Reset All User Scores to 0 (Global XP/Cupa)
            const usersSnapshot = await db.collection("users").get();
            usersSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    score: 0,
                    rushHighScore: 0
                });
            });

            await batch.commit();

            // 3. Update Current Session State
            this.state.score = 0;
            this.state.highScore = 0;
            this.state.rushHighScore = 0;
            this.saveData(); // Sync local storage
            this.updateHeaderStats();

            alert("✅ Kupa tablosu ve tüm oyuncu rekorları başarıyla sıfırlandı!");
        } catch (e) {
            console.error("Error resetting leaderboard:", e);
            alert("Sıfırlama sırasında bir hata oluştu: " + e.message);
        }
    },

    // ADVENTURE MODE LOGIC
    getDifficultyForLevel(lvl) {
        const allWords = this.getAllWords();
        const totalLevels = Math.floor(allWords.length / 50);

        if (lvl <= totalLevels * 0.3) return ['A1', 'A2'];
        if (lvl <= totalLevels * 0.7) return ['B1', 'B2'];
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

        // 1. Difficulty weight map
        const weights = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };

        // 2. Sort pool by Level weight, then Deterministically by ID
        pool.sort((a, b) => {
            const wa = weights[a.level || 'A1'] || 1;
            const wb = weights[b.level || 'A1'] || 1;
            if (wa !== wb) return wa - wb;
            return String(a.id).localeCompare(String(b.id));
        });

        // 3. Selection: Take a unique slice for this level
        // Level 1 -> [0, 50), Level 2 -> [50, 100), etc.
        const startIndex = (level - 1) * requiredCount;

        // Safety: If level is too high, loop back but ideally we stop at maxLevel
        const realStart = startIndex % pool.length;
        let selectedWords = pool.slice(realStart, realStart + requiredCount);

        // Fallback: If slice is short (at end of pool), fill from start
        if (selectedWords.length < requiredCount) {
            selectedWords = selectedWords.concat(pool.slice(0, requiredCount - selectedWords.length));
        }

        // 4. PRESENTATION: Shuffle order for gameplay variety (non-seeded)
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

        // Prefetch Audio
        if (window.ttsManager && word && word.word) {
            window.ttsManager.prefetch(word.word);
        }

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

        // Show Custom Modal
        const modal = document.getElementById('view-gameover');
        const title = modal.querySelector('h3');
        title.innerHTML = `💀 Seviye ${this.state.currentLevel} Başarısız!<br><span style="font-size:1rem; opacity:0.8">Başa dönülüyor...</span>`;

        // Configure Restart Button for Adventure Mode
        const btnRetry = modal.querySelector('.btn-primary');
        // We now use the HTML onclick="app.retryAdventure()" 
        // Just update the text to be specific
        btnRetry.textContent = "Tekrar Dene ↺";

        // Ensure Secondary Button is "Harita" (Adventure Mode Specific)
        const secondaryBtn = modal.querySelector('.btn-secondary');
        if (secondaryBtn) {
            secondaryBtn.textContent = 'Harita 🗺️';
            secondaryBtn.onclick = () => app.showLevelMap();
        }

        modal.classList.remove('hidden');
    },

    retryAdventure() {
        // If in Adventure mode, restart CURRENT level
        if (this.state.gameMode === 'adventure') {
            this.state.levelProgress = 0;
            this.state.adventureLives = 3;
            document.getElementById('view-gameover').classList.add('hidden');
            this.startAdventureLevel(); // Uses state.currentLevel, so it restarts existing level
        } else {
            // Fallback for other modes (Rush etc.) -> Start Game (Mode Selection or Restart)
            // For other modes, the button onclick might be different or we handle it here:
            document.getElementById('view-gameover').classList.add('hidden');
            this.startGame();
        }
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

        // Prefetch Audio
        if (window.ttsManager && this.state.currentWord && this.state.currentWord.word) {
            window.ttsManager.prefetch(this.state.currentWord.word);
        }

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

    },

    handleChoice(option, btn) {
        if (this.state.isProcessing) return;
        this.state.isProcessing = true;

        const isCorrect = (option === this.state.currentWord.meaning);

        if (isCorrect) {
            this.playSound('correct');
            btn.classList.add('correct');
            // Points System: +1 for Vocab
            this.state.score += 1;
            this.saveData(); // Persist

            // Visual feedback on button?
        } else {
            // Handle incorrect choice
            this.playSound('wrong');
            btn.classList.add('wrong');
        }

        // Reset processing state after a delay
        setTimeout(() => {
            this.state.isProcessing = false;
        }, 400);
    },

    handleAnswer(selectedOption, btnElement) {
        if (!this.state.currentWord) return;

        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        const isCorrect = selectedOption.id === this.state.currentWord.id;

        if (isCorrect) {
            btnElement.classList.add('correct');

            // Unified Scoring: +1 for Vocab (Global XP/Cupa)
            this.state.score += 1;

            // Differentiated Scoring: 
            // Rush Mode Rank gets +5, all other modes get +1 on their session score
            if (this.state.gameMode === 'rush') {
                this.state.sessionScore += 5;
            } else {
                this.state.sessionScore += 1;
            }

            if (this.state.score > this.state.highScore) this.state.highScore = this.state.score;

            // For Rush Mode: track session record
            if (this.state.gameMode === 'rush' && this.state.sessionScore > this.state.rushHighScore) {
                this.state.rushHighScore = this.state.sessionScore;
            }

            this.saveData(); // Persist + updateHeaderStats

            this.playSound('correct'); // SFX

            if (this.state.gameMode === 'adventure') {
                this.state.levelProgress++;
                this.updateLevelUI();
                setTimeout(() => this.nextAdventureQuestion(), 400);
            } else {
                setTimeout(() => this.nextQuestion(), 400);
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
                    setTimeout(() => this.failAdventureLevel(), 800);
                } else {
                    // Repeat same question
                    setTimeout(() => {
                        this.prepareGameForWord(this.state.currentWord); // Retry same word
                    }, 500);
                }
            } else if (this.state.gameMode === 'rush') {
                this.state.lives--;
                this.renderLives(); // Need to implement/update this helper or do it in renderGameQuestion? 
                // Better to update UI immediately
                const livesEl = document.getElementById('game-lives');
                if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);

                if (this.state.lives <= 0) {
                    setTimeout(() => this.endGame(), 800);
                } else {
                    setTimeout(() => this.nextQuestion(), 500);
                }
            } else if (this.state.gameMode === 'favorites') {
                this.state.lives--;
                this.renderLives();
                const livesEl = document.getElementById('game-lives');
                if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);

                if (this.state.lives <= 0) {
                    setTimeout(() => this.endGame(), 800);
                } else {
                    setTimeout(() => this.nextQuestion(), 500);
                }
            } else {
                // Survival - Instant Death
                setTimeout(() => this.endGame(), 800);
            }
        }
    },

    endGame(isTimeOut = false) {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);

        // Add Score to Wallet
        if (this.state.score > 0) {

            // Check High Score
            if (this.state.score > this.state.highScore) {
                this.state.highScore = this.state.score;
            }
        }

        // Leaderboard logic - ONLY for Rush Mode (Acele Modu)
        if (this.state.gameMode === 'rush' && this.state.score > 0) {
            this.saveScoreToFirebase();
        }

        this.saveData();

        document.getElementById('final-score').textContent = this.state.gameMode === 'rush' ? this.state.sessionScore : this.state.score;

        // Show correct header
        const title = document.querySelector('#view-gameover h3');
        if (title) {
            title.textContent = isTimeOut ? "⏰ Süre Doldu!" : (this.state.lives <= 0 ? "💔 Canın Kalmadı!" : "😵 Oyun Bitti!");
        }

        // Hide old input area definitely
        const nameInputArea = document.getElementById('name-input-area');
        if (nameInputArea) nameInputArea.classList.add('hidden');

        // Dynamic Navigation Button Logic
        const gameOverView = document.getElementById('view-gameover');
        const secondaryBtn = gameOverView.querySelector('.btn-secondary');

        if (secondaryBtn) {
            if (this.state.gameMode === 'adventure') {
                secondaryBtn.textContent = 'Harita 🗺️';
                secondaryBtn.onclick = () => app.showLevelMap();
            } else {
                // Rush, Favorites, etc. -> Go to Mode Selection
                secondaryBtn.textContent = 'Mod Seçimi 🎮';
                secondaryBtn.onclick = () => app.openModeSelection();
            }
        }

        gameOverView.classList.remove('hidden');
    },

    // New Helper to centralize exit logic if called from HTML directly (safety net)
    handleGameOverExit() {
        if (this.state.gameMode === 'adventure') {
            this.showLevelMap();
        } else {
            this.openModeSelection();
        }
    },

    quitGame() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        if (this.state.gameMode === 'adventure') {
            this.showLevelMap();
        } else {
            this.openModeSelection();
        }
    },

    // Helper needed for Rush Mode UI
    renderLives() {
        const livesEl = document.getElementById('game-lives');
        if (livesEl) livesEl.textContent = "❤️".repeat(this.state.lives);
    },

    updateLevelUI() {
        const livesEl = document.getElementById('game-lives');
        const levelInfo = document.getElementById('level-info-container');
        const levelIndicator = document.getElementById('level-indicator-container'); // NEW
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
            if (levelIndicator) levelIndicator.classList.remove('hidden'); // SHOW
            if (countInfo) countInfo.textContent = `${this.state.levelProgress} / 50`;
            if (bar) bar.style.width = `${(this.state.levelProgress / 50) * 100}%`;
        } else {
            if (levelInfo) levelInfo.classList.add('hidden');
            if (levelIndicator) levelIndicator.classList.add('hidden'); // HIDE
        }
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
        // Favorites
        const favCount = document.getElementById('dash-fav-count');
        if (favCount) {
            favCount.textContent = `⭐ ${this.state.favorites.length}`;
        }

        // Total Score
        const headerScore = document.getElementById('header-total-score');
        if (headerScore) {
            headerScore.textContent = `${this.state.score}`;
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





    // --- GLOBAL LEADERBOARD (CUPS) ---
    async openGlobalLeaderboard() {
        this.state.currentView = 'global-leaderboard';
        this.render();

        const list = document.getElementById('global-leaderboard-list');
        if (!list) return;

        list.innerHTML = '<li class="loading-state">Yükleniyor...</li>';

        try {
            const snapshot = await db.collection("users")
                .orderBy("score", "desc")
                .limit(10)
                .get();

            if (snapshot.empty) {
                list.innerHTML = '<li class="loading-state">Henüz kupa kazanan yok.</li>';
                return;
            }

            list.innerHTML = '';
            let rank = 1;

            snapshot.forEach(doc => {
                const data = doc.data();
                const isMe = (data.username === this.state.playerName);
                const medals = ['🥇', '🥈', '🥉'];
                let rankDisplay = rank;
                if (rank <= 3) rankDisplay = `<span class="rank-medal" style="font-size:1.5rem;">${medals[rank - 1]}</span>`;

                const li = document.createElement('li');
                li.className = `leaderboard-item ${isMe ? 'active' : ''}`;
                li.innerHTML = `
                    <span class="col-rank">${rankDisplay}</span>
                    <span class="col-player">${data.username} ${isMe ? '(Sen)' : ''}</span>
                    <span class="col-score">${data.score} 🏆</span>
                `;
                list.appendChild(li);
                rank++;
            });

        } catch (error) {
            console.error("Global Leaderboard Error:", error);
            list.innerHTML = `<li class="loading-state" style="color:#ef4444;">Hata: ${error.message}</li>`;
        }
    },



    // Legacy Rush Mode Leaderboard (Restored & Kept Separate)
    openLeaderboard() {
        this.state.currentView = 'leaderboard'; // This maps to #view-modes technically in old logic? No, wait.
        // The old openLeaderboard opened 'leaderboard' view.
        // But Rush Mode table is in #view-modes.
        // Let's leave this alone as it was restored.
        // However, we changed the button to call openGlobalLeaderboard.
        // So this function might be dead code or used by internal calls?
        // Checking usage: The Only usage was the header button.
        // So we can repurpose or ignore.
        // Actually, let's keep it safe.
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
                rankDisplay = `<span class="lb-rank">${index + 1}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${rankDisplay}</td>
                <td>${item.name}</td>
                <td>${item.score}</td>
            `;
            tbody.appendChild(tr);
        });
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
        return array;
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
        // Save the RUSH MODE BEST SCORE
        if (!auth.currentUser || this.state.gameMode !== 'rush') return;

        try {
            const uid = auth.currentUser.uid;

            // Check if this session's score is a record for this player
            // We use rushHighScore which is updated in handleAnswer

            // 1. Update User Profile (Source of Truth for XP)
            await db.collection("users").doc(uid).update({
                score: this.state.score, // Total XP
                rushHighScore: this.state.rushHighScore, // Personal Best in Rush
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Update Leaderboard (Dedicated Best Scores)
            // Use .doc(uid).set to ensure UNIQUE entries per player
            await db.collection("scores").doc(uid).set({
                name: this.state.playerName,
                uid: uid,
                score: this.state.rushHighScore, // Only save the BEST score
                date: new Date().toLocaleDateString('tr-TR'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log("Rush Record synced to Profile & Leaderboard!");
        } catch (e) {
            console.error("Error syncing High Score: ", e);
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

        if (window.ttsManager) {
            window.ttsManager.speak(textToSpeak, this.state.listening.voicePreference);
        }
    },

    // --- GEMINI AI SERVICE ---
    geminiService: {
        // Multi-Key Rotation System (supports up to 4 keys)
        apiKeys: [
            "AIzaSyAjIAR8yjA0kTPN23qxy0ovel-REpoH5Zc",  // Key 1
            "AIzaSyCKb-Cm2rnVlkA-WfkxjU5E_YHGrPqKObw",  // Key 2
            "AIzaSyCMQoab17MmEEBgSHqEeabHr_aNnyyfC48",  // Key 3
            "AIzaSyCKBMvmoImAWiVSgMfPpYlTYOQJrF1clEo"   // Key 4
        ],
        currentKeyIndex: 0,
        modelName: 'gemini-pro',  // Changed to gemini-pro for v1beta compatibility

        init() {
            // Clear old localStorage
            localStorage.removeItem('gemini_api_key');

            const savedModel = localStorage.getItem('gemini_valid_model');
            if (savedModel) this.modelName = savedModel;

            console.log(`🔑 Gemini Service initialized with ${this.apiKeys.length} API keys`);
        },

        async generateSentence() {
            if (this.apiKeys.length === 0) return null;

            const topics = ['Daily Life', 'Travel', 'Food', 'Work', 'School', 'Hobby', 'Family', 'Weather', 'Technology', 'Nature', 'Health', 'Shopping'];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];

            const prompt = `Generate a unique, simple English sentence (A1-B1 level) related to topic "${randomTopic}". 
            Also provide its correct Turkish translation.
            Return ONLY a pure JSON object with keys 'en' (the sentence) and 'tr' (meaning). 
            No markdown.`;

            // Try all keys in rotation
            for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
                const currentKey = this.apiKeys[this.currentKeyIndex];

                try {
                    console.log(`📡 AI Request (Key ${this.currentKeyIndex + 1}/${this.apiKeys.length}), Model: [${this.modelName}]`);

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${currentKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.candidates && data.candidates[0].content) {
                            let text = data.candidates[0].content.parts[0].text;
                            try {
                                const startIndex = text.indexOf('{');
                                const endIndex = text.lastIndexOf('}');
                                if (startIndex !== -1 && endIndex !== -1) {
                                    text = text.substring(startIndex, endIndex + 1);
                                    return JSON.parse(text);
                                }
                            } catch (e) {
                                console.error("JSON Parse Error:", e);
                            }
                        }
                    } else if (response.status === 429) {
                        // Quota exceeded - rotate to next key
                        console.warn(`⚠️ Key ${this.currentKeyIndex + 1} quota exceeded (429). Rotating...`);
                        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                        continue;
                    } else {
                        console.error(`API Error: ${response.status}`);
                        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                        continue;
                    }
                } catch (e) {
                    console.error("Network Error:", e);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                    continue;
                }
            }

            console.error("❌ All API keys exhausted for generateSentence");
            return null;
        },

        async checkAnswer(source, input, direction = 'EN_TR') {
            if (this.apiKeys.length === 0) return { error: "API anahtarı bulunamadı" };

            let prompt = '';

            if (direction === 'EN_TR') {
                prompt = `
                Act as a supportive Turkish language tutor.
                
                English Source: "${source.en}"
                User's Translation: "${input}"
                
                Task: Evaluation.
                Rules:
                1. Be FLEXIBLE. Accept synonyms, dropped pronouns, and minor typos.
                2. If the meaning is mostly preserved, mark it as TRUE.
                3. IGNORE punctuation and casing.
                
                Return ONLY a pure JSON object (no markdown):
                {
                    "isCorrect": boolean,
                    "feedback": "If Correct: Praise enthusiastically in Turkish. IF WRONG: Explain the specific mistake in Turkish."
                }`;
            } else {
                prompt = `
                Act as a supportive English language tutor for a Turkish speaker.
                
                Turkish Source: "${source.tr}"
                User's English translation: "${input}"
                
                Task: Evaluation.
                Rules:
                1. Be FLEXIBLE. Accept synonyms, American/British spelling, and minor typos.
                2. If the meaning is mostly preserved, mark it as TRUE.
                3. IGNORE punctuation and casing.
                
                Return ONLY a pure JSON object (no markdown):
                {
                    "isCorrect": boolean,
                    "feedback": "If Correct: Praise enthusiastically in English (keep it simple). IF WRONG: Explain the specific mistake in Turkish so the user understands."
                }`;
            }

            // Try all keys in rotation
            for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
                const currentKey = this.apiKeys[this.currentKeyIndex];

                try {
                    console.log(`🔍 Checking answer (Key ${this.currentKeyIndex + 1}/${this.apiKeys.length})`);

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${currentKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        if (data.candidates && data.candidates[0].content) {
                            let text = data.candidates[0].content.parts[0].text;
                            const startIndex = text.indexOf('{');
                            const endIndex = text.lastIndexOf('}');
                            if (startIndex !== -1 && endIndex !== -1) {
                                text = text.substring(startIndex, endIndex + 1);
                                return JSON.parse(text);
                            }
                        }
                    } else if (response.status === 429) {
                        console.warn(`⚠️ Key ${this.currentKeyIndex + 1} quota exceeded. Rotating...`);
                        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                        continue;
                    } else {
                        console.error(`API Error: ${response.status}`);
                        const apiError = data.error?.message || "Bilinmeyen API Hatası";
                        return { error: apiError };
                    }
                } catch (e) {
                    console.error("Network Error:", e);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                    continue;
                }
            }

            console.error("❌ All API keys exhausted for checkAnswer");
            return { error: "Yapay zeka çevrimdışı (Tüm API anahtarları limitte)" };
        }
    },

    // --- WRITING MODULE (New) ---
    openWritingModes() {
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'writing-modes';
        this.render();
    },

    goBackFromWriting() {
        // Navigate back to previous view or default to dashboard
        if (this.state.previousView) {
            this.state.currentView = this.state.previousView;
            this.state.previousView = null;
        } else {
            this.state.currentView = 'dashboard';
        }
        this.render();
    },

    startWritingMode() {
        // SCRAMBLE MODE (Legacy)
        if (!this.state.playerName) {
            alert("⚠️ Önce giriş yapmalısınız.");
            this.showLanding();
            return;
        }
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'writing';
        this.state.writingScore = 0;
        this.render();
        this.nextWritingQuestion();
    },

    startWritingInputMode() {
        console.log("Starting Writing Input Mode...");
        // DIRECT INPUT MODE
        if (!this.state.playerName) {
            alert("⚠️ Önce giriş yapmalısınız.");
            this.showLanding();
            return;
        }
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'writing-input';
        this.state.writingScore = 0;

        // RESET OVERLAY (Quota Saver)
        const overlay = document.getElementById('writing-input-start-overlay');
        if (overlay) {
            console.log("Overlay found, showing...");
            overlay.classList.remove('hidden');
        } else {
            console.error("Overlay NOT found!");
        }

        this.render();
        // this.nextWritingInputQuestion(); // DELAYED until user clicks Start
    },

    beginProWritingSession() {
        console.log("User clicked START");
        const overlay = document.getElementById('writing-input-start-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            console.log("Overlay hidden via classList");
        }
        this.nextWritingInputQuestion();
    },

    async nextWritingInputQuestion() {
        // Clear Inputs
        const input = document.getElementById('writing-direct-input');
        input.value = '';
        input.disabled = true;
        input.placeholder = 'Soruyu hazırlıyorum...';

        // Update Label
        const label = document.querySelector('.task-label');
        if (label) {
            if (this.state.writingDirection === 'EN_TR') {
                label.innerHTML = "İngilizce &rarr; Türkçe";
            } else {
                label.innerHTML = "Türkçe &rarr; İngilizce";
            }
        }

        document.getElementById('input-target-meaning').textContent = '...';

        // ALWAYS use sentences.js (no API quota cost!)
        const allSentences = this.getSentences();
        const sentenceData = allSentences[Math.floor(Math.random() * allSentences.length)];

        this.state.currentWritingSentence = sentenceData;

        // Render Question based on direction
        // document.getElementById('writing-input-score').textContent = this.state.writingScore; // REMOVED

        if (this.state.writingDirection === 'EN_TR') {
            // EN -> TR
            document.getElementById('input-target-meaning').textContent = sentenceData.en;
            input.placeholder = 'Türkçesi nedir?';
        } else {
            // TR -> EN
            document.getElementById('input-target-meaning').textContent = sentenceData.tr; // Show Turkish
            input.placeholder = 'İngilizcesi nedir?'; // Ask for English
        }

        input.disabled = false;
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

    toggleWritingDirection() {
        if (this.state.writingDirection === 'EN_TR') {
            this.state.writingDirection = 'TR_EN';
        } else {
            this.state.writingDirection = 'EN_TR';
        }

        // Update Button UI (Classes)
        const btn = document.getElementById('btn-lang-toggle');
        if (btn) {
            btn.classList.remove('mode-en-tr', 'mode-tr-en');

            if (this.state.writingDirection === 'EN_TR') {
                btn.classList.add('mode-en-tr');
            } else {
                btn.classList.add('mode-tr-en');
            }

            // Animation
            const arrow = btn.querySelector('#toggle-arrow');
            if (arrow) {
                arrow.classList.remove('rotate-anim');
                void arrow.offsetWidth; // Trigger reflow
                arrow.classList.add('rotate-anim');
            }
        }

        // Reload question
        this.nextWritingInputQuestion();
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
                result = await this.geminiService.checkAnswer(this.state.currentWritingSentence, val, this.state.writingDirection);
            } catch (err) {
                console.error("AI Check failed, falling back to local:", err);
            }
        }

        if (result && !result.error) {
            // AI Success
            isCorrect = result.isCorrect;
            feedback = result.feedback;
        } else {
            // Fallback: Local match (Offline or API Fail)
            let errorMsg = "Yapay zeka çevrimdışı";
            if (result && result.error) {
                const err = result.error.toLowerCase();

                if (err.includes('quota') || err.includes('429') || err.includes('rate limit')) {
                    if (err.includes('daily') || err.includes('exceeded')) {
                        errorMsg = "🛑 GÜNLÜK Kota Doldu! (Başka API Key girin)";
                    } else {
                        errorMsg = "⏳ Çok Hızlısın! (15sn Bekle)";
                    }
                } else if (err.includes('key') || err.includes('403')) {
                    errorMsg = "🔑 Geçersiz API Key";
                } else {
                    errorMsg += ` (${result.error})`;
                }
            }

            // Improved Fuzzy Logic: Token-based comparison to allow flexibility in word order and minor typos.
            const cleanInput = val.toLowerCase().replace(/[.,!?'"]/g, ' ').trim();
            const inputTokens = cleanInput.split(/\s+/).filter(t => t.length > 0).sort();

            let targetText = '';
            if (this.state.writingDirection === 'EN_TR') {
                targetText = this.state.currentWritingSentence.tr;
            } else {
                targetText = this.state.currentWritingSentence.en;
            }

            const cleanTarget = targetText.toLowerCase().replace(/[.,!?'"]/g, ' ').trim();
            const targetTokens = cleanTarget.split(/\s+/).filter(t => t.length > 0).sort();

            // Calculate intersection
            let matchCount = 0;
            inputTokens.forEach(token => {
                if (targetTokens.includes(token)) matchCount++;
            });

            // If more than 70% of significant words match, consider it correct.
            const accuracy = matchCount / Math.max(inputTokens.length, targetTokens.length);
            isCorrect = accuracy >= 0.7;

            // Also check for simple containment as a safety net
            if (!isCorrect) {
                const simpleInput = val.toLowerCase().replace(/\s+/g, '');
                const simpleTarget = targetText.toLowerCase().replace(/\s+/g, '');
                isCorrect = simpleInput === simpleTarget;
            }

            if (isCorrect) {
                feedback = `Güzel! (${errorMsg} ama kelime bazlı eşleşme başarılı.)`;
            } else {
                feedback = `Eşleşmedi. (${errorMsg} olduğu için sadece kelime kontrolü yapabildim.)`;
            }
        }

        if (isCorrect) {
            this.playSound('correct');
            // Award 1 point for correct answer
            this.state.score += 1;
            this.state.writingScore += 1;
            this.saveData(); // Persist
            this.updateHeaderStats(); // Update UI immediately

            // document.getElementById('writing-input-score').textContent = this.state.writingScore; // REMOVED

            this.updateChat('ai', `✅ <b>Doğru!</b> ${feedback} (+1 Puan)`);

            btn.textContent = "DEVAM ET ->";
            btn.disabled = false;
            btn.style.background = '#22c55e';
            btn.style.color = 'white';
            btn.onclick = () => app.nextWritingInputQuestion();

        } else {
            this.playSound('wrong');

            const correctText = this.state.writingDirection === 'EN_TR' ?
                this.state.currentWritingSentence.tr :
                this.state.currentWritingSentence.en;

            this.updateChat('ai', `❌ <b>Yanlış.</b> ${feedback}<br><br>Doğru Çeviri: <i>${correctText}</i>`);

            btn.textContent = "DEVAM ET ->";
            btn.disabled = false;
            btn.style.background = '#ef4444';
            btn.style.color = 'white';
            btn.onclick = () => app.nextWritingInputQuestion();
        }
    },

    passWritingQuestion() {
        this.updateChat('user', 'Pas geçtim.');
        const correctText = this.state.writingDirection === 'EN_TR' ?
            this.state.currentWritingSentence.tr :
            this.state.currentWritingSentence.en;
        this.updateChat('ai', `Sorun değil! Cevap şuydu: <b>${correctText}</b>`);
        this.nextWritingInputQuestion();
    },

    giveUpWritingInput() {
        this.updateChat('user', 'Pes ediyorum 🏳️');
        const correctText = this.state.writingDirection === 'EN_TR' ?
            this.state.currentWritingSentence.tr :
            this.state.currentWritingSentence.en;
        this.updateChat('ai', `Pes etmek yok! 💪 Doğrusu buydu:<br><b>${correctText}</b>`);

        const btn = document.getElementById('btn-check-answer');
        btn.textContent = "DEVAM ET ->";
        btn.onclick = () => app.nextWritingInputQuestion();
    },
    getSentences() {
        // Use external huge list if available, else small fallback
        if (window.SENTENCE_DATA && window.SENTENCE_DATA.length > 0) {
            return window.SENTENCE_DATA;
        }
        return [
            { en: "I am ready", tr: "Hazırım" },
            { en: "See you later", tr: "Sonra görüşürüz" }
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
        if (key.length === 1 && /[a-zçğıöşü ]/i.test(key)) {
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
        // Check if word is complete
        if (this.state.writingInput.includes(null)) {
            const fb = document.getElementById('writing-feedback');
            fb.textContent = "Kelime tamamlanmadı!";
            fb.style.color = "#ef4444";
            setTimeout(() => fb.textContent = '', 1500);
            return;
        }

        // Get formed word
        const formedWord = this.state.writingInput.map(i => i.char).join('');
        const targetWord = this.state.currentWritingWord.word.toUpperCase();
        const isCorrect = (formedWord === targetWord);

        if (isCorrect) {
            this.playSound('correct');

            // AWARD EXACTLY 1 POINT
            this.state.score = this.state.score + 1;
            this.state.writingScore = this.state.writingScore + 1;

            // Save and update UI
            this.saveData();
            this.updateHeaderStats();

            // Visual feedback
            const slots = document.querySelectorAll('.writing-slot');
            slots.forEach(s => {
                s.classList.add('correct-anim');
                s.style.borderColor = '#22c55e';
            });

            const fb = document.getElementById('writing-feedback');
            fb.textContent = "DOĞRU! 🎉 (+1 Puan)";
            fb.style.color = "#22c55e";

            setTimeout(() => {
                this.nextWritingQuestion();
            }, 500);

        } else {
            // Wrong answer
            this.playSound('wrong');
            const fb = document.getElementById('writing-feedback');
            fb.textContent = "YANLIŞ! Tekrar dene.";
            fb.style.color = "#ef4444";

            const slots = document.querySelectorAll('.writing-slot');
            slots.forEach(s => {
                s.classList.add('wrong-anim');
                s.style.borderColor = '#ef4444';
            });

            setTimeout(() => {
                slots.forEach(s => {
                    s.classList.remove('wrong-anim');
                    s.style.borderColor = '';
                });
            }, 500);
        }
    },

    // --- GRAMMAR MODE ---

    // --- GRAMMAR MODE ---
    openGrammarLevelSelection() {
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'grammar-intro';
        this.render();
        this.updateGrammarCounts();
    },

    updateGrammarCounts() {
        if (!window.GRAMMAR_DATA) return;

        const cards = document.querySelectorAll('.grammar-topic-card');
        cards.forEach(card => {
            const onclick = card.getAttribute('onclick');
            if (onclick && onclick.includes("app.startGrammarMode('")) {
                // Extract topic ID: app.startGrammarMode('tenses') -> tenses
                const topicId = onclick.split("'")[1];

                // Count questions
                const count = window.GRAMMAR_DATA.filter(q => q.topic_id === topicId).length;

                // Update UI
                const countSpan = card.querySelector('.topic-count');
                if (countSpan) {
                    countSpan.textContent = `${count} Soru`;

                    // Visual cue for empty topics
                    if (count === 0) {
                        countSpan.style.color = '#ef4444';
                        countSpan.textContent = 'Hazırlanıyor...';
                        card.style.opacity = '0.7';
                        card.style.cursor = 'not-allowed';
                    } else {
                        countSpan.style.color = '';
                        card.style.opacity = '1';
                        card.style.cursor = 'pointer';
                    }
                }
            }
        });
    },

    startGrammarMode(topic) {
        this.state.grammarTopic = topic; // Keep track of the current topic
        this.state.grammarScore = 0;
        this.state.grammarScore = 0;


        // Find topic title for display
        const topicCard = document.querySelector(`.grammar-topic-card[onclick="app.startGrammarMode('${topic}')"]`);
        const title = topicCard ? topicCard.querySelector('h3').textContent : topic;
        document.getElementById('grammar-topic').textContent = title;

        // Filter questions
        if (!window.GRAMMAR_DATA) {
            console.error("Grammar data not loaded!");
            alert("Dil bilgisi verileri yüklenemedi.");
            return;
        }

        const questions = window.GRAMMAR_DATA.filter(q => q.topic_id === topic);

        if (questions.length === 0) {
            alert("Bu konu için henüz soru hazırlanmadı.");
            return;
        }

        this.state.grammarQuestions = this.shuffleArray(questions); // Store shuffled questions
        this.state.grammarQuestionIndex = 0; // Start from the first question

        this.state.previousView = this.state.currentView;
        this.state.currentView = 'grammar';
        this.render();
        this.nextGrammarQuestion();
    },

    showGrammarExplanation(topicId) {
        const modal = document.getElementById('grammar-explanation-modal');
        const titleEl = document.getElementById('explanation-title');
        const bodyEl = document.getElementById('explanation-body');

        if (!window.GRAMMAR_EXPLANATIONS || !window.GRAMMAR_EXPLANATIONS[topicId]) {
            console.warn("Explanation not found for:", topicId);
            titleEl.textContent = "Hazırlanıyor...";
            bodyEl.innerHTML = "<p>Bu konu için henüz anlatım eklenmedi.</p>";
        } else {
            const data = window.GRAMMAR_EXPLANATIONS[topicId];
            titleEl.textContent = data.title;
            bodyEl.innerHTML = data.content;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },

    closeGrammarExplanation() {
        const modal = document.getElementById('grammar-explanation-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    },

    nextGrammarQuestion() {
        // Reset UI
        document.getElementById('grammar-feedback-text').textContent = '';
        document.getElementById('grammar-explanation').textContent = '';
        document.getElementById('btn-grammar-next').style.display = 'none';

        const passBtn = document.getElementById('btn-grammar-pass');
        if (passBtn) passBtn.style.display = 'inline-block';

        // Pick Random
        const questions = this.state.grammarQuestions;
        const q = questions[Math.floor(Math.random() * questions.length)];
        this.state.currentGrammarQuestion = q;

        this.renderGrammarQuestion();
    },

    passGrammarQuestion() {
        // Show correct answer and move on
        const q = this.state.currentGrammarQuestion;

        // Show correct answer in gap
        const gap = document.getElementById('current-gap');
        if (gap) {
            gap.textContent = q.options[q.correct];
            gap.classList.add('filled');
        }

        // Highlight correct button
        const btns = document.querySelectorAll('.grammar-option-btn');
        btns.forEach((b, idx) => {
            b.disabled = true;
            if (idx === q.correct) b.classList.add('correct');
        });

        // Show explanation
        document.getElementById('grammar-feedback-text').textContent = "Cevap Gösterildi";
        document.getElementById('grammar-feedback-text').style.color = "var(--text-secondary)";
        document.getElementById('grammar-explanation').textContent = q.explanation;

        // Hide Pass, Show Next
        const passBtn = document.getElementById('btn-grammar-pass');
        if (passBtn) passBtn.style.display = 'none';

        document.getElementById('btn-grammar-next').style.display = 'inline-block';
    },

    renderGrammarQuestion() {
        const q = this.state.currentGrammarQuestion;

        // Update Score


        // Update Topic
        document.getElementById('grammar-topic').textContent = `${this.state.grammarLevel} - ${q.topic}`;

        // Render Question with Gap
        const questionEl = document.getElementById('grammar-question');
        // Replace ___ with a span
        const parts = q.question.split('___');
        if (parts.length === 2) {
            questionEl.innerHTML = `${parts[0]}<span class="grammar-gap" id="current-gap"></span>${parts[1]}`;
        } else {
            questionEl.textContent = q.question;
        }

        // Render Options
        const optionsContainer = document.getElementById('grammar-options');
        optionsContainer.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'grammar-option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.checkGrammarAnswer(idx, btn);
            optionsContainer.appendChild(btn);
        });
    },

    checkGrammarAnswer(selectedIndex, btnElement) {
        // Disable all options
        const btns = document.querySelectorAll('.grammar-option-btn');
        btns.forEach(b => b.disabled = true);

        const q = this.state.currentGrammarQuestion;
        const isCorrect = selectedIndex === q.correct;
        const gap = document.getElementById('current-gap');
        const feedbackText = document.getElementById('grammar-feedback-text');
        const explanation = document.getElementById('grammar-explanation');
        const nextBtn = document.getElementById('btn-grammar-next');
        const passBtn = document.getElementById('btn-grammar-pass');

        // Fill the gap
        if (gap) {
            gap.textContent = q.options[selectedIndex];
            gap.classList.add('filled');
        }

        if (isCorrect) {
            this.playSound('correct');
            btnElement.classList.add('correct');
            feedbackText.textContent = "DOĞRU! 🎉 (+1 Puan)";
            feedbackText.style.color = "var(--neon-green)";

            // Points System: +1 for Grammar
            this.state.score += 1;
            this.state.grammarScore += 1;
            this.saveData(); // Persist
            this.updateHeaderStats(); // Update UI immediately

            if (gap) {
                gap.textContent = q.options[q.correct];
                gap.classList.add('filled', 'correct');
            }

            // Hide Pass button
            if (passBtn) passBtn.style.display = 'none';

            // Auto next after 1.5s
            setTimeout(() => {
                this.nextGrammarQuestion();
            }, 1500);

        } else {
            this.playSound('wrong');

            if (gap) gap.classList.add('wrong');
            btnElement.classList.add('wrong');

            // Highlight correct answer
            btns[q.correct].classList.add('correct'); // Show which was right

            feedbackText.textContent = "YANLIŞ";
            feedbackText.style.color = "#ef4444";

            explanation.textContent = q.explanation;

            // Hide Pass button, Show Next
            if (passBtn) passBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }
    },

    returnToDashboard() {
        this.state.currentView = 'dashboard';
        this.render();
    },

    openReadingListeningModes() {
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'reading-listening';
        this.render();
    },

    initScenarioMode() {
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'scenarios';
        this.render();
        this.renderScenarios();
    },

    renderScenarios() {
        const container = document.getElementById('scenario-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (!window.SCENARIO_DATA) {
            container.innerHTML = '<p style="color:white; text-align:center; grid-column:1/-1;">Senaryolar yüklenemedi.</p>';
            return;
        }

        // --- SORT BY LEVEL (A1 -> C2) ---
        const levelOrder = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
        const getLevelWeight = (lvl) => {
            if (!lvl) return 99;
            const primary = lvl.split('-')[0].trim().toUpperCase();
            return levelOrder[primary] || 99;
        };

        const sortedScenarios = [...window.SCENARIO_DATA].sort((a, b) => {
            return getLevelWeight(a.level) - getLevelWeight(b.level);
        });

        sortedScenarios.forEach(scenario => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.background = scenario.bg
                ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${scenario.bg}) center/cover`
                : 'var(--card-bg)';
            card.style.border = '1px solid rgba(255,255,255,0.1)';
            card.onclick = () => this.openScenario(scenario.id);

            card.innerHTML = `
                <div class="book-cover" style="font-size:2.5rem; margin-bottom:0.8rem; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));">${scenario.icon || '💬'}</div>
                <div class="book-title" style="color:var(--accent-gold); font-weight:800; font-size:1.1rem; margin-bottom:0.2rem;">${scenario.title_tr || scenario.title}</div>
                <div class="book-author" style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:0.8rem; opacity:0.8;">${scenario.title}</div>
                <div style="display:inline-block; padding:4px 10px; background:rgba(255,255,255,0.1); border-radius:12px; font-size:0.7rem; color:var(--accent-gold); border: 1px solid rgba(212, 175, 55, 0.3);">
                    ${scenario.level || 'B1-B2'}
                </div>
            `;
            container.appendChild(card);
        });
    },

    openScenario(id) {
        const scenario = window.SCENARIO_DATA.find(s => s.id === id);
        if (!scenario) return;

        this.state.currentScenario = scenario;
        this.state.currentDialogueIndex = 0;
        this.state.isScenarioPlaying = true; // Auto start
        this.state.showScenarioTranslation = true;

        this.state.previousView = this.state.currentView;
        this.state.currentView = 'scenario-player';
        this.render();

        document.getElementById('scenario-player-title').textContent = scenario.title_tr || scenario.title;
        const dialogueArea = document.getElementById('scenario-dialogue-area');
        if (dialogueArea) dialogueArea.innerHTML = '';

        const playBtn = document.getElementById('btn-scenario-play');
        if (playBtn) playBtn.textContent = '⏸';

        this.renderScenarioStep();
    },

    renderScenarioStep() {
        const scenario = this.state.currentScenario;
        const dialogueArea = document.getElementById('scenario-dialogue-area');
        if (!scenario || !dialogueArea) return;

        const item = scenario.content[this.state.currentDialogueIndex];
        if (!item) return;

        const bubble = document.createElement('div');
        bubble.className = 'dialogue-bubble ' + (this.state.currentDialogueIndex % 2 === 0 ? 'speaker-1' : 'speaker-2');

        // Dynamic styles if CSS classes are missing
        const isSpeaker1 = this.state.currentDialogueIndex % 2 === 0;
        bubble.style.cssText = `
            max-width: 85%;
            margin-bottom: 1rem;
            padding: 1rem 1.2rem;
            border-radius: 1.5rem;
            position: relative;
            align-self: ${isSpeaker1 ? 'flex-start' : 'flex-end'};
            background: ${isSpeaker1 ? 'rgba(30, 41, 59, 0.8)' : 'rgba(212, 175, 55, 0.15)'};
            border: 1px solid ${isSpeaker1 ? 'rgba(255,255,255,0.1)' : 'rgba(212, 175, 55, 0.3)'};
            color: white;
            animation: fadeInDialog 0.5s ease-out;
            backdrop-filter: blur(10px);
        `;

        bubble.innerHTML = `
            <div style="font-size:0.75rem; color:var(--accent-gold); margin-bottom:0.3rem; font-weight:bold;">${item.speaker}</div>
            <div style="font-size:1rem; line-height:1.4;">${item.text}</div>
            <div class="tr-text" style="font-size:0.85rem; color:rgba(255,255,255,0.6); margin-top:0.5rem; font-style:italic; display: ${this.state.showScenarioTranslation ? 'block' : 'none'};">
                ${item.tr}
            </div>
        `;

        dialogueArea.appendChild(bubble);
        bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Auto play speech with gender-based voice
        const speakerGender = this._getScenarioSpeakerGender(item.speaker, this.state.currentDialogueIndex);
        this.speakScenarioItem(item.text, speakerGender);
    },

    // Determine speaker gender from the speaker label
    _getScenarioSpeakerGender(speaker, index) {
        if (!speaker) return index % 2 === 0 ? 'male' : 'female';

        // Check all content for this speaker's first appearance with gender tag
        const scenario = this.state.currentScenario;
        if (scenario && scenario.content) {
            // Get the base name of the speaker (without gender tag)
            const baseName = speaker.replace(/\s*\((?:Male|Female)\)/, '').trim();

            // Search through all dialogues to find gender tag for this base name
            for (const item of scenario.content) {
                const itemBase = item.speaker.replace(/\s*\((?:Male|Female)\)/, '').trim();
                if (itemBase === baseName) {
                    if (item.speaker.includes('(Female)')) return 'female';
                    if (item.speaker.includes('(Male)')) return 'male';
                }
            }
        }

        // Direct check on current speaker
        if (speaker.includes('(Female)')) return 'female';
        if (speaker.includes('(Male)')) return 'male';

        // Fallback: alternate by index
        return index % 2 === 0 ? 'male' : 'female';
    },

    speakScenarioItem(text, gender) {
        if (!window.ttsManager) return;

        // Male = andrew (deep voice), Female = ava (soft voice)
        const voice = gender === 'female' ? 'ava' : 'andrew';

        window.ttsManager.speak(text, voice).then(() => {
            if (this.state.isScenarioPlaying) {
                setTimeout(() => {
                    if (this.state.currentDialogueIndex < this.state.currentScenario.content.length - 1) {
                        this.state.currentDialogueIndex++;
                        this.renderScenarioStep();
                    } else {
                        this.state.isScenarioPlaying = false;
                        const playBtn = document.getElementById('btn-scenario-play');
                        if (playBtn) playBtn.textContent = '▶';
                    }
                }, 600); // Reduced delay for more natural flow
            }
        });
    },

    toggleScenarioPlay() {
        this.state.isScenarioPlaying = !this.state.isScenarioPlaying;
        const btn = document.getElementById('btn-scenario-play');
        btn.textContent = this.state.isScenarioPlaying ? '⏸' : '▶';

        if (this.state.isScenarioPlaying) {
            if (this.state.currentDialogueIndex < this.state.currentScenario.content.length - 1) {
                // If not at end, maybe move to next or just restart current if paused?
                // Let's just start/resume
                this.renderScenarioStep();
            } else {
                // Finished scenario - restart
                this.restartScenario();
                this.state.isScenarioPlaying = true;
                btn.textContent = '⏸';
            }
        } else {
            if (window.ttsManager) window.ttsManager.stop();
        }
    },

    restartScenario() {
        this.state.currentDialogueIndex = 0;
        this.state.isScenarioPlaying = false;
        document.getElementById('btn-scenario-play').textContent = '▶';
        document.getElementById('scenario-dialogue-area').innerHTML = '';
        if (window.ttsManager) window.ttsManager.stop();
        this.renderScenarioStep();
    },

    toggleScenarioTranslation() {
        this.state.showScenarioTranslation = !this.state.showScenarioTranslation;
        const trTexts = document.querySelectorAll('.tr-text');
        trTexts.forEach(el => {
            el.style.display = this.state.showScenarioTranslation ? 'block' : 'none';
        });
    },

    // --- READING MODE ---
    // --- READING MODE ---
    async openReadingMode() {
        this.state.previousView = this.state.currentView;
        this.state.currentView = 'reading';
        this.render();

        // Show Loading State
        const grid = document.getElementById('library-grid');
        if (grid) {
            grid.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:200px;">
                    <div class="loader" style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--neon-blue); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top:1rem; color:var(--text-secondary);">Kütüphane Oluşturuluyor...</p>
                </div>
            `;
        }

        // Add spinner animation if not exists
        if (!document.getElementById('loader-style')) {
            const style = document.createElement('style');
            style.id = 'loader-style';
            style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        await this.loadBookData();
        this.renderLibrary();
    },

    loadBookData() {
        return new Promise((resolve) => {
            if (this.state.areBooksLoaded) {
                resolve();
                return;
            }

            console.log("Lazy Loading Books...");

            // Core init file must load first
            const initScript = document.createElement('script');
            initScript.src = 'js/books.js';
            initScript.onload = () => {
                // Now load the rest in parallel
                const scripts = [
                    'js/aesop_books.js',
                    'js/dolittle_books.js',
                    'js/fairy_tales_books.js',
                    'js/grimms_books.js',
                    'js/jungle_book_books.js',
                    'js/little_princess_books.js',
                    'js/mother_goose_books.js',
                    'js/mother_west_wind_books.js',
                    'js/peter_pan_books.js',
                    'js/peter_rabbit_books.js',
                    'js/pride_prejudice_books.js',
                    'js/tom_sawyer_books.js',
                    'js/wizard_oz_books.js',
                    'js/secret_garden_books.js',
                    'js/railway_children_books.js',
                    'js/sherlock_books.js',
                    'js/gatsby_books.js',
                    'js/dorian_gray_books.js',
                    'js/frankenstein_books.js',
                    'js/treasure_island_books.js'
                ];

                let loaded = 0;
                let total = scripts.length;

                if (total === 0) {
                    this.state.areBooksLoaded = true;
                    resolve();
                    return;
                }

                scripts.forEach(src => {
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = () => {
                        loaded++;
                        if (loaded === total) {
                            console.log("All books loaded.");
                            this.state.areBooksLoaded = true;
                            resolve();
                        }
                    };
                    s.onerror = () => {
                        console.error("Failed to load book:", src);
                        loaded++; // continue anyway
                        if (loaded === total) {
                            this.state.areBooksLoaded = true;
                            resolve();
                        }
                    };
                    document.body.appendChild(s);
                });
            };
            document.body.appendChild(initScript);
        });
    },



    renderLibrary() {
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '';

        if (!window.BOOK_DATA) {
            grid.innerHTML = '<p>Kitaplar yüklenemedi.</p>';
            return;
        }

        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        levels.forEach(level => {
            const books = window.BOOK_DATA[level];
            if (books && Array.isArray(books) && books.length > 0) {
                // Grouping Logic
                const groups = {};
                books.forEach((book, index) => {
                    // Extract base title (e.g. "Peter Pan - Vol 1" -> "Peter Pan")
                    // Regex: Anything before " - Vol X"
                    const match = book.title.match(/^(.*?) - Vol \d+$/);
                    const baseTitle = match ? match[1] : book.title;

                    if (!groups[baseTitle]) {
                        groups[baseTitle] = [];
                    }
                    groups[baseTitle].push({ ...book, originalIndex: index });
                });

                // Create Shelf Group
                const group = document.createElement('div');
                group.className = 'shelf-group';

                const title = document.createElement('div');
                title.className = 'shelf-title';
                title.textContent = `Seviye ${level}`;
                group.appendChild(title);

                const row = document.createElement('div');
                row.className = 'shelf-row';

                // Render Groups
                Object.keys(groups).forEach(baseTitle => {
                    const groupBooks = groups[baseTitle];
                    const isSeries = groupBooks.length > 1;
                    const representative = groupBooks[0]; // Use first book for cover/color

                    const card = document.createElement('div');
                    card.className = 'book-card';
                    card.style.backgroundColor = representative.color || '#2d3436';

                    if (isSeries) {
                        // Series Card
                        card.onclick = () => this.openVolumeSelector(level, baseTitle, groupBooks);
                        card.innerHTML = `
                            <div class="book-cover">${representative.cover || '📚'}</div>
                            <div class="book-title">${baseTitle}</div>
                            <div class="book-author">${representative.author}</div>
                            <div class="series-badge">${groupBooks.length} Cilt</div>
                        `;
                    } else {
                        // Single Book
                        card.onclick = () => this.openBook(level, representative.originalIndex);
                        card.innerHTML = `
                            <div class="book-cover">${representative.cover || '📖'}</div>
                            <div class="book-title">${representative.title}</div>
                            <div class="book-author">${representative.author}</div>
                        `;
                    }
                    row.appendChild(card);
                });

                // Add Shelf Ledge
                const ledge = document.createElement('div');
                ledge.className = 'shelf-ledge';
                row.appendChild(ledge);

                group.appendChild(row);
                grid.appendChild(group);
            }
        });
    },

    openVolumeSelector(level, title, books) {
        // Remove existing modal if any
        const existing = document.getElementById('volume-selector-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'volume-selector-modal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '3000';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        const content = document.createElement('div');
        content.className = 'modal-content volume-selector-content';

        // Header
        content.innerHTML = `
            <div class="volume-header">
                <h3 style="margin:0; color:var(--accent-gold);">${title}</h3>
                <button class="btn-icon-small" onclick="document.getElementById('volume-selector-modal').remove()">&times;</button>
            </div>
            <p style="color:var(--text-secondary); margin-bottom:1.5rem;">Okumak istediğin cildi seç:</p>
            <div class="volume-grid"></div>
        `;

        const grid = content.querySelector('.volume-grid');

        books.forEach(book => {
            const btn = document.createElement('button');
            btn.className = 'volume-btn';
            btn.style.borderColor = book.color || 'rgba(255,255,255,0.2)';

            // Extract Vol Number usually at end
            const volMatch = book.title.match(/Vol (\d+)$/);
            const volNum = volMatch ? volMatch[1] : '?';

            btn.onclick = () => {
                document.getElementById('volume-selector-modal').remove();
                this.openBook(level, book.originalIndex);
            };

            btn.innerHTML = `
                <div class="vol-icon" style="background:${book.color || '#444'}">${book.cover}</div>
                <div class="vol-info">
                    <span class="vol-label">Cilt ${volNum}</span>
                    <span class="vol-sub">Bölüm ${volNum === '1' ? '1-??' : '??-??'}</span> 
                </div>
                <div class="vol-arrow">→</div>
            `;
            grid.appendChild(btn);
        });

        modal.appendChild(content);
        document.body.appendChild(modal);
    },

    getPaginatedPages(originalPages, maxLines = 7) {
        if (!originalPages || originalPages.length === 0) return [];

        let allLines = [];
        originalPages.forEach(page => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page;
            const children = Array.from(tempDiv.children);

            if (children.length === 0 && page.trim()) {
                allLines.push(`<p>${page.trim()}</p>`);
            } else {
                children.forEach(child => {
                    allLines.push(child.outerHTML);
                });
            }
        });

        let newPages = [];
        for (let i = 0; i < allLines.length; i += maxLines) {
            newPages.push(allLines.slice(i, i + maxLines).join('\n'));
        }
        return newPages;
    },


    openBook(level, index = 0) {
        const books = window.BOOK_DATA[level];
        if (!books || !books[index]) return;
        const book = books[index];

        // Apply Dynamic Re-pagination (7 lines max for mobile)
        const paginatedPages = this.getPaginatedPages(book.pages, 7);

        // Initialize state
        this.state.currentBookLevel = level;
        this.state.currentBookIndex = index;
        // Check for bookmark
        const savedPage = this.getBookmark(book.title);
        if (savedPage !== null && savedPage < paginatedPages.length) {
            this.state.currentBookPage = savedPage;
        } else {
            this.state.currentBookPage = 0;
        }

        this.state.paginatedPages = paginatedPages;
        this.state.totalBookPages = paginatedPages.length;

        document.getElementById('reading-library').classList.add('hidden');
        document.getElementById('reading-reader').classList.remove('hidden');

        document.getElementById('reader-book-title').textContent = book.title;
        document.getElementById('reader-book-level').textContent = `Seviye ${book.level}`;

        // Render page
        this.renderBookPage();

        // Reset search
        document.getElementById('dictionary-search').value = '';

        // Add Swipe Support
        this.setupReaderGestures();
    },

    setupReaderGestures() {
        const reader = document.getElementById('reading-reader');
        if (!reader) return;

        let touchStartX = 0;
        let touchEndX = 0;

        reader.ontouchstart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
        };

        reader.ontouchend = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        };
    },

    handleSwipe(start, end) {
        const delta = end - start;
        const minDistance = 50;

        if (Math.abs(delta) > minDistance) {
            if (delta > 0) {
                // Swipe Right (Previous)
                this.prevBookPage();
            } else {
                // Swipe Left (Next)
                this.nextBookPage();
            }
        }
    },

    closeBook() {
        this.state.currentBookLevel = null;
        this.state.currentBookIndex = null;
        this.state.currentBookPage = 0;

        this.stopBookReading(); // Stop Audio

        document.getElementById('reading-reader').classList.add('hidden');
        document.getElementById('reading-library').classList.remove('hidden');
    },

    renderBookPage() {
        if (!this.state.currentBookLevel) return;

        // Use paginated pages from state
        const pages = this.state.paginatedPages;
        if (!pages || pages.length === 0) return;

        const content = pages[this.state.currentBookPage];
        document.getElementById('reader-content').innerHTML = content;

        // Update page indicator
        const indicator = document.getElementById('page-indicator');
        if (indicator) {
            indicator.textContent = `Sayfa ${this.state.currentBookPage + 1} / ${this.state.totalBookPages}`;
        }

        // Update button states
        const prevBtn = document.getElementById('btn-prev-page');
        const nextBtn = document.getElementById('btn-next-page');
        if (prevBtn) prevBtn.disabled = this.state.currentBookPage === 0;
        if (nextBtn) nextBtn.disabled = this.state.currentBookPage === this.state.totalBookPages - 1;

        // Update bookmark visual state
        const ribbon = document.getElementById('bookmark-ribbon');
        if (ribbon) {
            const bookTitle = document.getElementById('reader-book-title').textContent;
            const savedPage = this.getBookmark(bookTitle);
            if (savedPage === this.state.currentBookPage) {
                ribbon.classList.add('active');
            } else {
                ribbon.classList.remove('active');
            }
        }

        // Scroll to top
        const readerContent = document.getElementById('reader-content');
        if (readerContent) readerContent.scrollTop = 0;
    },

    toggleBookmark() {
        const bookTitle = document.getElementById('reader-book-title').textContent;
        const currentProgress = this.getBookmark(bookTitle);

        if (currentProgress === this.state.currentBookPage) {
            // Remove bookmark
            localStorage.removeItem(`bookmark_${bookTitle}`);
            this.playSound('click');
        } else {
            // Set bookmark
            localStorage.setItem(`bookmark_${bookTitle}`, this.state.currentBookPage);
            this.playSound('correct');
        }

        this.renderBookPage(); // Refresh UI
    },

    getBookmark(bookTitle) {
        const val = localStorage.getItem(`bookmark_${bookTitle}`);
        return val !== null ? parseInt(val) : null;
    },

    speakCurrentPage() {
        if (this.state.isReadingBook) {
            this.stopBookReading();
        } else {
            this.startBookReading();
        }
    },

    startBookReading() {
        const contentArea = document.getElementById('reader-content');
        if (!contentArea) return;

        // Clean HTML
        const rawText = contentArea.innerHTML.replace(/<[^>]*>/g, ' ');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawText;
        const cleanText = tempDiv.textContent || tempDiv.innerText || "";

        if (!cleanText || cleanText.trim() === "") return;

        this.state.isReadingBook = true;

        // Update Icon to Stop
        const btn = document.getElementById('btn-book-speak');
        if (btn) {
            btn.innerHTML = '⏹️';
            btn.style.borderColor = '#ef4444';
            btn.style.color = '#ef4444';
        }

        // USE NEW PYTHON TTS MANAGER
        if (window.ttsManager) {
            window.ttsManager.speak(cleanText, this.state.listening.voicePreference).then(() => {
                if (this.state.isReadingBook) {
                    setTimeout(() => {
                        if (this.state.isReadingBook && this.state.currentBookPage < this.state.totalBookPages - 1) {
                            this.nextBookPage(true);
                        } else {
                            this.stopBookReading();
                        }
                    }, 600);
                }
            }).catch(err => {
                console.log("[Book] Reading interrupted or failed:", err.message);
            });
        }
    },

    stopBookReading() {
        this.state.isReadingBook = false;

        if (window.ttsManager) {
            window.ttsManager.stop();
        }

        const btn = document.getElementById('btn-book-speak');
        if (btn) {
            btn.innerHTML = '🔊';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            btn.style.color = 'var(--accent-gold)';
        }
    },

    nextBookPage(isAuto = false) {
        if (!isAuto) this.stopBookReading(); // Manual turn stops audio

        if (this.state.currentBookPage < this.state.totalBookPages - 1) {
            const content = document.getElementById('reader-content');
            content.classList.add('flip-next');

            setTimeout(() => {
                this.state.currentBookPage++;
                this.renderBookPage();

                // If Auto Turn, Restart Audio
                if (isAuto) {
                    setTimeout(() => this.startBookReading(), 400);
                }

                setTimeout(() => content.classList.remove('flip-next'), 300);
            }, 300);
        }
    },

    prevBookPage() {
        this.stopBookReading(); // Always stop on prev

        if (this.state.currentBookPage > 0) {
            const content = document.getElementById('reader-content');
            content.classList.add('flip-prev');

            setTimeout(() => {
                this.state.currentBookPage--;
                this.renderBookPage();
                setTimeout(() => content.classList.remove('flip-prev'), 300);
            }, 300);
        }
    },

    lookupWord(word) {
        if (!word || word.trim() === '') return;

        const searchTerm = word.trim().toLowerCase();

        // Find word in WORD_DATA (approx 30k words)
        // Optimized: find first exact match or startsWith
        let result = window.WORD_DATA.find(w => w.word.toLowerCase() === searchTerm);

        if (!result) {
            // Try startsWith if exact match fails
            // result = window.WORD_DATA.find(w => w.word.toLowerCase().startsWith(searchTerm));
        }

        const toast = document.getElementById('dict-toast');
        const wordEl = document.getElementById('dict-word');
        const meanEl = document.getElementById('dict-meaning');
        const levelEl = document.getElementById('dict-level');

        if (!toast || !wordEl || !meanEl || !levelEl) return;

        if (result) {
            wordEl.textContent = result.word;
            meanEl.textContent = result.meaning;
            levelEl.textContent = result.level;
            levelEl.style.display = 'inline-block';

            // Check if favorite
            const isFav = this.state.favorites.includes(result.id);
            const starBtn = document.getElementById('dict-star-btn');
            if (starBtn) {
                starBtn.setAttribute('data-word-id', result.id);
                if (isFav) starBtn.classList.add('active');
                else starBtn.classList.remove('active');
                starBtn.style.display = 'flex';
            }
        } else {
            wordEl.textContent = word;
            meanEl.textContent = "Kelime bulunamadı.";
            levelEl.style.display = 'none';

            const starBtn = document.getElementById('dict-star-btn');
            if (starBtn) starBtn.style.display = 'none'; // Hide star if not found
        }

        toast.classList.add('show');

        // Hide after 4 seconds
        if (this.dictTimeout) clearTimeout(this.dictTimeout);
        this.dictTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    },

    toggleDictToastFavorite() {
        const starBtn = document.getElementById('dict-star-btn');
        if (!starBtn) return;

        const id = parseInt(starBtn.getAttribute('data-word-id'));
        if (!id || isNaN(id)) return;

        this.toggleFavorite(id);

        // Update UI immediately
        const isFav = this.state.favorites.includes(id);
        if (isFav) starBtn.classList.add('active');
        else starBtn.classList.remove('active');

        // Update list if open
        if (this.state.currentView === 'list') {
            this.renderList();
        }
    },

    handleSearchInput(query) {
        const suggestionsBox = document.getElementById('search-suggestions');

        if (!query || query.length < 2) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
            return;
        }

        const searchTerm = query.toLowerCase();

        // Filter WORD_DATA for matches starting with query
        // Limit to 8 matches
        const matches = window.WORD_DATA.filter(w =>
            w.word.toLowerCase().startsWith(searchTerm)
        ).slice(0, 8);

        if (matches.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        suggestionsBox.innerHTML = '';
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';

            // Highlight match
            const regex = new RegExp(`^(${searchTerm})`, 'gi');
            const highlighted = match.word.replace(regex, '<span class="suggestion-match">$1</span>');

            const isFav = this.state.favorites.includes(match.id);
            const starIcon = isFav ? '★' : '☆';
            const starClass = isFav ? 'active' : '';

            div.innerHTML = `
                <div class="suggestion-text">
                    ${highlighted} <span style="font-size:0.8em; opacity:0.7">(${match.meaning})</span>
                </div>
                <button class="suggestion-star ${starClass}" onclick="event.stopPropagation(); app.toggleSuggestionFavorite(${match.id}, this)">
                    ${starIcon}
                </button>
            `;

            div.onclick = () => {
                this.lookupWord(match.word);
                document.getElementById('dictionary-search').value = match.word;
                this.hideSuggestions();
            };
            suggestionsBox.appendChild(div);
        });

        suggestionsBox.style.display = 'block';
    },

    toggleSuggestionFavorite(id, btn) {
        this.toggleFavorite(id);
        const isFav = this.state.favorites.includes(id);
        btn.innerHTML = isFav ? '★' : '☆';
        if (isFav) btn.classList.add('active');
        else btn.classList.remove('active');

        // Also update main dictionary toast star if visible and matching
        const toastStar = document.getElementById('dict-star-btn');
        if (toastStar && parseInt(toastStar.getAttribute('data-word-id')) === id) {
            if (isFav) toastStar.classList.add('active');
            else toastStar.classList.remove('active');
        }

        // Update list if open
        if (this.state.currentView === 'list') {
            this.renderList();
        }
    },

    hideSuggestions() {
        const box = document.getElementById('search-suggestions');
        if (box) {
            // Small delay to allow click event to register
            setTimeout(() => {
                box.style.display = 'none';
            }, 200);
        }
    },

    // --- EMAIL AUTH SYSTEM ---
    openLoginModal() {
        const modal = document.getElementById('view-login-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        document.getElementById('auth-error-msg').textContent = '';

        const rememberedEmail = localStorage.getItem('remembered_email');
        const remView = document.getElementById('remembered-account-view');
        const stdView = document.getElementById('standard-auth-view');

        if (rememberedEmail) {
            stdView.classList.add('hidden');
            remView.classList.remove('hidden');
            document.getElementById('remembered-email-display').textContent = rememberedEmail;
            document.getElementById('rem-login-password').value = '';
            document.getElementById('rem-login-password').focus();

            document.getElementById('auth-title').textContent = "Tekrar Hoş Geldin!";
            document.getElementById('auth-subtitle').textContent = "Kaldığın yerden devam etmek için şifreni gir.";
        } else {
            remView.classList.add('hidden');
            stdView.classList.remove('hidden');
            this.switchAuthTab('login');
        }
    },

    resetRememberedEmail() {
        localStorage.removeItem('remembered_email');
        const remView = document.getElementById('remembered-account-view');
        const stdView = document.getElementById('standard-auth-view');
        if (remView) remView.classList.add('hidden');
        if (stdView) stdView.classList.remove('hidden');
        this.switchAuthTab('login');
    },

    switchAuthTab(tab) {
        document.getElementById('tab-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');

        document.getElementById('tab-login').style.borderBottom = tab === 'login' ? '2px solid var(--accent-gold)' : 'none';
        document.getElementById('tab-register').style.borderBottom = tab === 'register' ? '2px solid var(--accent-gold)' : 'none';

        document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
        document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');

        document.getElementById('auth-title').textContent = tab === 'login' ? "Hesap Girişi" : "Yeni Hesap Oluştur";
        document.getElementById('auth-subtitle').textContent = tab === 'login' ?
            "Skorlarını kaydetmek için giriş yap." : "Hemen kayıt ol ve yarışmaya katıl!";

        document.getElementById('auth-error-msg').textContent = '';
    },

    async submitLogin(isRemembered = false) {
        let email, password;
        if (isRemembered) {
            email = localStorage.getItem('remembered_email');
            password = document.getElementById('rem-login-password').value.trim();
        } else {
            email = document.getElementById('login-email').value.trim();
            password = document.getElementById('login-password').value.trim();
        }

        const errorEl = document.getElementById('auth-error-msg');

        if (!email || !password) {
            errorEl.textContent = "Lütfen tüm alanları doldur.";
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            localStorage.setItem('remembered_email', email); // Save for next time
            document.getElementById('view-login-modal').classList.add('hidden');
        } catch (error) {
            console.error("Login Error:", error);
            const msg = this.getAuthErrorMessage(error.code);
            errorEl.textContent = msg;
        }
    },

    async submitRegister() {
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const errorEl = document.getElementById('auth-error-msg');

        if (!username || !email || !password) {
            errorEl.textContent = "Lütfen tüm alanları doldur.";
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = "Şifre en az 6 karakter olmalı.";
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                score: 0
            });

            await user.updateProfile({ displayName: username });

            localStorage.setItem('remembered_email', email); // Save for next time
            document.getElementById('view-login-modal').classList.add('hidden');
        } catch (error) {
            console.error("Register Error:", error);
            const msg = this.getAuthErrorMessage(error.code);
            errorEl.textContent = msg;
        }
    },

    getAuthErrorMessage(code) {
        switch (code) {
            case 'auth/email-already-in-use': return "Bu e-posta zaten kullanılıyor.";
            case 'auth/invalid-email': return "Geçersiz e-posta adresi.";
            case 'auth/wrong-password': return "Şifre yanlış.";
            case 'auth/user-not-found': return "Kullanıcı bulunamadı.";
            case 'auth/weak-password': return "Şifre çok zayıf.";
            case 'auth/operation-not-allowed': return "Giriş yöntemi kapalı.";
            case 'auth/network-request-failed': return "Bağlantı hatası.";
            case 'auth/too-many-requests': return "Çok fazla deneme! Biraz bekleyin.";
            default: return "Bir hata oluştu.";
        }
    },

    completeLogin(name) {
        // Fix: Remove recursive call to self
        this.state.playerName = name;
        this.showDashboard();
    },

    // =========================================
    // NEW SMART AUDIO MANAGER (Restored & Improved)
    // =========================================

    initListeningMode() {
        this.state.currentView = 'listening';
        this.render();

        // Load Sentences
        if (window.SENTENCE_DATA && window.SENTENCE_DATA.length > 0) {
            // Shuffle initial list
            this.state.listening.sentences = [...window.SENTENCE_DATA].sort(() => 0.5 - Math.random());
            this.state.listening.currentIndex = 0;

            // Ensure UI is ready
            setTimeout(() => {
                this.setupSmartVoiceUI();
                this.renderListeningLevel();
            }, 100);
        } else {
            alert("Cümle verisi yüklenemedi!");
            this.openModeSelection();
        }
    },

    setupSmartVoiceUI() {
        const select = document.getElementById('listening-voice-select');
        if (select) {
            select.innerHTML = `
                <option value="andrew">🇺🇸 Amerikan - Andrew (Erkek)</option>
                <option value="ava">🇺🇸 Amerikan - Ava (Kadın)</option>
                <option value="emma">🇺🇸 Amerikan - Emma (Kadın)</option>
                <option value="brian">🇺🇸 Amerikan - Brian (Erkek)</option>
                <option value="jenny">🇺🇸 Amerikan - Jenny (Kadın)</option>
                <option value="guy">🇺🇸 Amerikan - Guy (Erkek)</option>
            `;

            // Set current
            select.value = this.state.listening.voicePreference || 'andrew';

            select.onchange = (e) => {
                this.setVoicePreference(e.target.value);
            };
        }
    },

    setVoicePreference(pref) {
        this.state.listening.voicePreference = pref;
        console.log("Voice Preference Set:", pref);

        // Play sample
        this.playSentence(1);
    },

    // Voice resolution is now handled by Python backend/TTSManager
    resolveActualVoice() {
        this.state.listening.selectedVoice = { name: 'Python Edge-TTS' };
    },

    renderListeningLevel() {
        // Loop safety: if we reach the end, reshuffle and restart
        if (this.state.listening.currentIndex >= this.state.listening.sentences.length) {
            this.state.listening.sentences.sort(() => 0.5 - Math.random());
            this.state.listening.currentIndex = 0;
        }

        const sentenceObj = this.state.listening.sentences[this.state.listening.currentIndex];
        if (!sentenceObj) return;

        this.state.listening.currentSentence = sentenceObj;

        // Reset voice selection for Python mode
        if (!this.state.listening.selectedVoice) {
            this.state.listening.selectedVoice = { name: 'Python Edge-TTS' };
        }

        // Setup UI (Gap, Inputs etc.)
        const inputEl = document.getElementById('listening-input');
        if (inputEl) {
            inputEl.value = '';
            inputEl.disabled = false;
            inputEl.readOnly = false;
            inputEl.focus();
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const nextBtn = document.getElementById('btn-listening-next');
                    if (nextBtn && !nextBtn.classList.contains('hidden')) {
                        this.nextListeningLevel();
                    } else {
                        this.checkListeningAnswer();
                    }
                }
            };
        }

        const feedbackEl = document.getElementById('listening-feedback');
        if (feedbackEl) feedbackEl.innerHTML = '';

        const checkBtn = document.getElementById('btn-check-listening');
        if (checkBtn) checkBtn.disabled = false;

        const giveUpBtn = document.getElementById('btn-giveup-listening');
        if (giveUpBtn) giveUpBtn.disabled = false;

        const nextBtn = document.getElementById('btn-listening-next');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Logic for Gaps
        const words = sentenceObj.en.split(' ');
        let gapIndex = Math.floor(Math.random() * words.length);
        // Try to find a longer word
        for (let i = 0; i < 5; i++) {
            if (words[gapIndex].length < 3) gapIndex = Math.floor(Math.random() * words.length);
        }
        this.state.listening.currentGapIndex = gapIndex;

        const displayContainer = document.getElementById('listening-sentence-display');
        if (displayContainer) {
            displayContainer.innerHTML = '';
            words.forEach((word, index) => {
                const span = document.createElement('span');
                span.className = 'word';
                if (index === gapIndex) {
                    span.className = 'word gap';
                    span.textContent = '_____';
                    span.dataset.answer = word.replace(/[.,!?]/g, '');
                } else {
                    span.textContent = word + ' ';
                }
                displayContainer.appendChild(span);
            });
        }

        // Auto Play
        setTimeout(() => this.playSentence(1), 500);
    },

    playSentence(rate = 1) {
        if (!this.state.listening.currentSentence) return;

        const text = this.state.listening.currentSentence.en;
        const voice = this.state.listening.voicePreference;

        // Visuals
        const wave = document.querySelector('.audio-wave');
        if (wave) wave.classList.add('playing');

        if (window.ttsManager) {
            window.ttsManager.speak(text, voice).then(() => {
                if (wave) wave.classList.remove('playing');
            }).catch(() => {
                if (wave) wave.classList.remove('playing');
            });
        }
    },

    checkListeningAnswer() {
        const input = document.getElementById('listening-input');
        const userVal = input.value.trim().toLowerCase();

        const words = this.state.listening.currentSentence.en.split(' ');
        const correctRaw = words[this.state.listening.currentGapIndex];
        const correctClean = correctRaw.replace(/[.,!?]/g, '').toLowerCase();

        const feedback = document.getElementById('listening-feedback');
        const nextBtn = document.getElementById('btn-listening-next');

        if (userVal === correctClean) {
            feedback.innerHTML = '<span style="color:#4ade80; font-weight:bold;">Doğru! 🎉</span>';
            const gapEl = document.querySelector('.word.gap');
            if (gapEl) {
                gapEl.textContent = correctRaw + ' ';
                gapEl.classList.add('revealed');
                gapEl.classList.remove('gap');
            }
            input.readOnly = true;
            document.getElementById('btn-check-listening').disabled = true;
            document.getElementById('btn-giveup-listening').disabled = true;
            if (nextBtn) nextBtn.classList.remove('hidden');

            this.state.score++;
            this.updateHeaderStats();
            this.saveData();
            this.playSound('correct');

            if (this.listeningTimeout) clearTimeout(this.listeningTimeout);
            this.listeningTimeout = setTimeout(() => this.nextListeningLevel(), 500);
        } else {
            feedback.innerHTML = '<span style="color:#ef4444;">Tekrar dene!</span>';
            this.playSound('wrong');
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
            input.focus();
        }
    },

    giveUpListening() {
        const words = this.state.listening.currentSentence.en.split(' ');
        const correctRaw = words[this.state.listening.currentGapIndex];

        const feedback = document.getElementById('listening-feedback');
        if (feedback) feedback.innerHTML = `<span style="color:#fbbf24;">Cevap: ${correctRaw}</span>`;

        const gapEl = document.querySelector('.word.gap');
        if (gapEl) {
            gapEl.textContent = correctRaw + ' ';
            gapEl.classList.add('revealed');
            gapEl.classList.remove('gap');
        }

        const input = document.getElementById('listening-input');
        if (input) input.readOnly = true;

        document.getElementById('btn-check-listening').disabled = true;
        document.getElementById('btn-giveup-listening').disabled = true;

        const nextBtn = document.getElementById('btn-listening-next');
        if (nextBtn) nextBtn.classList.remove('hidden');

    },

    nextListeningLevel() {
        if (this.listeningTimeout) clearTimeout(this.listeningTimeout);
        this.state.listening.currentIndex++;
        this.renderListeningLevel();
    },

    // --- VOICE SETTINGS ---
    openVoiceSettings() {
        const modal = document.getElementById('view-voice-settings-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        this.renderVoiceOptions();
    },

    closeVoiceSettings() {
        const modal = document.getElementById('view-voice-settings-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.style.display = 'none';

        if (window.ttsManager) {
            // window.ttsManager.stop(); 
        }
    },

    renderVoiceOptions() {
        const container = document.getElementById('voice-options-container');
        if (!container) return;
        container.innerHTML = '';

        const voices = [
            { id: 'andrew', name: 'Andrew (Erkek)', flag: '🇺🇸', description: 'Amerikan (Standart)' },
            { id: 'ava', name: 'Ava (Kadın)', flag: '🇺🇸', description: 'Amerikan (Doğal)' },
            { id: 'brian', name: 'Brian (Erkek)', flag: '🇺🇸', description: 'Amerikan (Hızlı)' },
            { id: 'emma', name: 'Emma (Kadın)', flag: '🇺🇸', description: 'Amerikan (Yumuşak)' },
            { id: 'guy', name: 'Guy (Erkek)', flag: '🇺🇸', description: 'Amerikan (Derin)' },
            { id: 'jenny', name: 'Jenny (Kadın)', flag: '🇺🇸', description: 'Amerikan (Resmi)' }
        ];

        // Ensure default
        if (!this.state.listening) this.state.listening = {};
        if (!this.state.listening.voicePreference) {
            this.state.listening.voicePreference = localStorage.getItem('voice_preference') || 'andrew';
        }
        const currentId = this.state.listening.voicePreference;

        voices.forEach(voice => {
            const isSelected = currentId === voice.id;
            const card = document.createElement('div');
            card.className = `voice-option-card ${isSelected ? 'selected' : ''}`;
            card.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 1rem; border-radius: 12px; cursor: pointer;
                background: ${isSelected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)'};
                border: 1px solid ${isSelected ? '#22c55e' : 'rgba(255,255,255,0.1)'};
                transition: all 0.2s;
                margin-bottom: 0.5rem;
            `;

            card.onclick = () => this.previewAndSelectVoice(voice.id);

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="font-size:1.8rem;">${voice.flag}</div>
                    <div>
                        <div style="font-weight:bold; font-size:1rem; color:${isSelected ? '#22c55e' : 'white'}">${voice.name}</div>
                        <div style="font-size:0.8rem; color:rgba(255,255,255,0.6);">${voice.description}</div>
                    </div>
                </div>
                <div style="font-size:1.2rem;">
                   ${isSelected ? '✅' : '🔊'}
                </div>
            `;
            container.appendChild(card);
        });
    },

    previewAndSelectVoice(voiceId) {
        this.state.listening.voicePreference = voiceId;
        localStorage.setItem('voice_preference', voiceId);

        // Re-render UI to show selection
        this.renderVoiceOptions();

        // Also update listening mode selector if present
        const listeningSelect = document.getElementById('listening-voice-select');
        if (listeningSelect) listeningSelect.value = voiceId;

        // Play Sample
        if (window.ttsManager) {
            window.ttsManager.stop();
            const phrase = "Hello! This is my voice.";
            window.ttsManager.speak(phrase, voiceId);
        }
    },

};

window.onload = () => {
    try {
        if (typeof firebase === 'undefined') {
            alert("Firebase yüklenemedi! İnternet bağlantınızı kontrol edin.");
            return;
        }
        app.init();
    } catch (e) {
        alert("Başlatma Hatası: " + e.message + "\n" + e.stack);
        console.error(e);
    }
};
window.app = app; // Expose to window for HTML onclick handlers
