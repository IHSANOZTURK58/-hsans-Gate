/**
 * İhsan's Gate — TTS Manager (Python Backend Edition)
 */

class TTSManager {
    constructor() {
        // Cloud TTS URL — deploy sonrası buraya Render URL'nizi yazın
        this.cloudUrl = 'https://ihsansgate-tts.onrender.com';
        this.localUrl = 'http://localhost:3000';
        this.proxyUrl = this.cloudUrl; // Start with cloud, fallback to local
        this.defaultVoice = 'andrew';
        this.isPlaying = false;
        this.currentAudio = null;
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.activeRequestId = 0;
        this._healthChecked = false;

        // Auto-detect: try cloud first, fallback to localhost
        this._serverReady = this._autoDetectServer();
    }

    _fetchWithTimeout(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            fetch(url, { signal: controller.signal })
                .then(r => { clearTimeout(timer); resolve(r); })
                .catch(e => { clearTimeout(timer); reject(e); });
        });
    }

    async _autoDetectServer() {
        // Try cloud first
        try {
            const r = await this._fetchWithTimeout(`${this.cloudUrl}/api/health`, 5000);
            if (r.ok) {
                this.proxyUrl = this.cloudUrl;
                this._healthChecked = true;
                console.log('[TTS] ☁️ Cloud sunucusuna bağlandı:', this.cloudUrl);
                return;
            }
        } catch (e) {
            console.log('[TTS] Cloud bağlantısı başarısız, yerel deneniyor...');
        }

        // Try local
        try {
            const r = await this._fetchWithTimeout(`${this.localUrl}/api/health`, 2000);
            if (r.ok) {
                this.proxyUrl = this.localUrl;
                this._healthChecked = true;
                console.log('[TTS] 🖥️ Yerel sunucuya bağlandı:', this.localUrl);
                return;
            }
        } catch (e) { /* local unavailable */ }

        // Default to cloud URL anyway (it may come online later)
        this.proxyUrl = this.cloudUrl;
        console.warn('[TTS] ⚠️ Sunucu bulunamadı, cloud URL kullanılacak:', this.cloudUrl);
        this._healthChecked = true;
    }

    async speak(text, voice) {
        if (!text || typeof text !== 'string') return;
        text = text.trim();
        if (text.length === 0) return;

        // Wait for server detection to finish before first speak
        if (!this._healthChecked && this._serverReady) {
            await this._serverReady;
        }

        // Invalidate previous requests
        this.stop();

        // Capture NEW ID after stop() has incremented it
        const requestId = this.activeRequestId;

        const v = voice || this.defaultVoice;
        try {
            const audioUrl = `${this.proxyUrl}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(v)}`;

            if (requestId !== this.activeRequestId) return;
            await this._playAudio(audioUrl, requestId);
        } catch (error) {
            console.warn('[TTS] Python sunucusu baglantisi basarisiz, tarayici sesine geciliyor:', error.message);
            if (requestId === this.activeRequestId) {
                this._fallbackSpeak(text);
            }
        }
    }

    _playAudio(audioUrl, requestId) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.preload = 'auto';

            this.currentAudio = audio;
            this.isPlaying = true;

            audio.onplay = () => {
                if (requestId !== this.activeRequestId) {
                    audio.pause();
                    audio.src = "";
                }
            };

            audio.onended = () => {
                if (this.currentAudio === audio) {
                    this.isPlaying = false;
                    this.currentAudio = null;
                }
                resolve();
            };

            audio.onerror = (e) => {
                if (this.currentAudio === audio) {
                    this.isPlaying = false;
                    this.currentAudio = null;
                }
                reject(new Error('Ses calinamadi'));
            };

            audio.play().catch(err => {
                // If aborted, reject so .then() doesn't fire in app.js
                if (err.name === 'AbortError') {
                    reject(new Error('Aborted'));
                } else if (requestId === this.activeRequestId) {
                    reject(err);
                } else {
                    reject(new Error('Stale request'));
                }
            });
        });
    }

    _fallbackSpeak(text) {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }

    stop() {
        this.activeRequestId++; // Invalidate any ongoing speak() calls to prevent fallback
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.src = "";
                this.currentAudio.load();
            } catch (e) { }
            this.currentAudio = null;
        }
        this.isPlaying = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    _addToCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const oldest = this.cache.keys().next().value;
            const oldUrl = this.cache.get(oldest);
            URL.revokeObjectURL(oldUrl);
            this.cache.delete(oldest);
        }
        this.cache.set(key, value);
    }

    async checkHealth() {
        try {
            const r = await fetch(`${this.proxyUrl}/api/health`);
            return await r.json();
        } catch (e) {
            return { status: 'offline', error: e.message };
        }
    }
}

window.ttsManager = new TTSManager();
