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
        this.maxCacheSize = 20; // Cache last 20 audio files
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

    async warmup() {
        // Explicitly trigger a health check to wake up Render instance
        console.log('[TTS] 🔥 Sunucu ısıtılıyor (Warmup)...');
        try {
            await fetch(`${this.proxyUrl}/api/health`, { mode: 'no-cors' });
            console.log('[TTS] 🔥 Sunucu ısıtma isteği gönderildi.');
        } catch (e) {
            console.log('[TTS] Warmup isteği sessizce başarısız oldu (Sorun değil).');
        }
    }

    prefetch(text, voice) {
        if (!text) return;
        const v = voice || this.defaultVoice;
        const key = `${text}|${v}`;

        if (this.cache.has(key)) {
            // Already cached
            console.log(`[TTS] ⚡ Prefetch: '${text}' zaten önbellekte.`);
            return;
        }

        const audioUrl = `${this.proxyUrl}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(v)}`;
        
        // Create audio object but DO NOT PLAY
        const audio = new Audio(audioUrl);
        audio.preload = 'auto'; // Force buffer
        audio.load(); // Trigger load
        
        this._addToCache(key, audio);
        console.log(`[TTS] 📥 Prefetch: '${text}' arka planda yükleniyor...`);
    }

    async speak(text, voice) {
        if (!text || typeof text !== 'string') return;
        text = text.trim();
        if (text.length === 0) return;

        const v = voice || this.defaultVoice;
        const key = `${text}|${v}`;

        // Wait for server detection to finish before first speak
        if (!this._healthChecked && this._serverReady) {
            await this._serverReady;
        }

        // Stop current audio
        this.stop();

        // Check Cache First
        if (this.cache.has(key)) {
            console.log(`[TTS] 🚀 Cache'den oynatılıyor: '${text}'`);
            const audio = this.cache.get(key);
            
            // Reuse cached audio
            this.activeRequestId++;
            const requestId = this.activeRequestId;

            return new Promise((resolve, reject) => {
                this.currentAudio = audio;
                this.isPlaying = true;
                audio.currentTime = 0; // Reset to start

                const cleanup = () => {
                    audio.onended = null;
                    audio.onerror = null;
                };

                audio.onended = () => {
                    if (this.currentAudio === audio) {
                        this.isPlaying = false;
                        this.currentAudio = null;
                    }
                    cleanup();
                    resolve();
                };

                audio.onerror = (e) => {
                    cleanup();
                    // If cache file failed (expired url?), try fresh fetch
                    console.warn('[TTS] Cache oynatma hatası, yenileniyor...');
                    this.cache.delete(key);
                    resolve(this._speakFresh(text, v, requestId));
                };

                audio.play().catch(e => {
                    console.error("[TTS] Play error:", e);
                    reject(e);
                });
            });
        }

        // If not in cache, fresh fetch
        this.activeRequestId++;
        return this._speakFresh(text, v, this.activeRequestId);
    }

    async _speakFresh(text, voice, requestId) {
        const key = `${text}|${voice}`;
        try {
            const audioUrl = `${this.proxyUrl}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
            
            if (requestId !== this.activeRequestId) return;
            
            // Create and Cache instantly
            const audio = new Audio(audioUrl);
            audio.preload = 'auto';
            this._addToCache(key, audio);

            await this._playAudioObject(audio, requestId);
        } catch (error) {
            console.warn('[TTS] Bağlantı başarısız, fallback deneniyor:', error.message);
            if (requestId === this.activeRequestId) {
                this._fallbackSpeak(text);
            }
        }
    }

    _playAudioObject(audio, requestId) {
        return new Promise((resolve, reject) => {
            this.currentAudio = audio;
            this.isPlaying = true;

            audio.onended = () => {
                if (this.currentAudio === audio) {
                    this.isPlaying = false;
                    this.currentAudio = null;
                }
                resolve();
            };

            audio.onerror = (e) => {
                this.isPlaying = false;
                this.currentAudio = null;
                reject(new Error('Ses çalınamadı'));
            };

            audio.play().catch(err => {
                if (requestId === this.activeRequestId) reject(err);
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
        this.activeRequestId++;
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) { }
            this.currentAudio = null;
        }
        this.isPlaying = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    _addToCache(key, audioValue) {
        // Simple LRU-like: if full, delete oldest
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, audioValue);
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
