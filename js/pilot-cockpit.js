/**
 * AIR NAVIGATION TERMINAL - AVIONICS INTERACTIVE CORE
 * Provides Live Zulu Clock, Cockpit Web Audio synthesizer,
 * Question Jump Navigator, and Keyboard Shortcuts.
 */

// ==========================================
// 1. REAL-TIME ZULU (UTC) CLOCK
// ==========================================
function updateZuluClock() {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    const zuluString = `ZULU: ${hours}:${minutes}:${seconds}Z`;

    document.querySelectorAll('.zulu-clock').forEach(el => {
        el.textContent = zuluString;
    });
}
setInterval(updateZuluClock, 1000);
updateZuluClock();

// ==========================================
// 2. COCKPIT WEB AUDIO SYNTHESIZER
// ==========================================
let audioContext = null;
let soundEnabled = localStorage.getItem('pilot_sound_active') === 'true';

function initAudio() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioContext = new AudioContextClass();
        }
    }
}

function playCockpitBeep(type = 'click') {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioContext) return;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const now = audioContext.currentTime;

        if (type === 'click') {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'correct') {
            // Dual chime (Chime-1 -> Chime-2)
            const osc1 = audioContext.createOscillator();
            const osc2 = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc1.type = 'triangle';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.setValueAtTime(880, now + 0.08); // A5
            osc2.frequency.setValueAtTime(880, now);
            osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioContext.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
        } else if (type === 'wrong') {
            // Caution tone
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(180, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        }
    } catch (e) {
        // Audio error silent fallback
    }
}

function toggleCockpitSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('pilot_sound_active', soundEnabled ? 'true' : 'false');
    updateSoundToggleUI();
    if (soundEnabled) {
        initAudio();
        playCockpitBeep('correct');
    }
}

function updateSoundToggleUI() {
    document.querySelectorAll('.hud-sound-toggle').forEach(btn => {
        btn.innerHTML = soundEnabled
            ? `<span style="color: var(--cyan-primary);">🔊 AUDIO ON</span>`
            : `<span>🔇 AUDIO OFF</span>`;
    });
}
document.addEventListener('DOMContentLoaded', updateSoundToggleUI);

// ==========================================
// 3. KEYBOARD SHORTCUTS ENGINE
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs/textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Keys 1..4 or A..D to answer options
    const key = e.key.toLowerCase();
    
    // Quiz options selection:
    if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(key)) {
        let optIndex = -1;
        if (key === '1' || key === 'a') optIndex = 0;
        else if (key === '2' || key === 'b') optIndex = 1;
        else if (key === '3' || key === 'c') optIndex = 2;
        else if (key === '4' || key === 'd') optIndex = 3;

        // Try selecting option in both quiz types:
        const quizBtns = document.querySelectorAll('#quiz-options-container .option-btn, #quiz-options .mcq-option');
        if (quizBtns.length > optIndex && !quizBtns[optIndex].disabled && !quizBtns[optIndex].classList.contains('disabled')) {
            quizBtns[optIndex].click();
            playCockpitBeep('click');
        }
    }

    // Left Arrow: Previous
    if (e.key === 'ArrowLeft') {
        const prevBtn = document.querySelector('#quiz-prev-btn:not(:disabled), #num-prev-btn:not(:disabled), #prac-prev-btn:not(:disabled), #main-prev-btn:not(:disabled)');
        if (prevBtn) {
            prevBtn.click();
            playCockpitBeep('click');
        }
    }

    // Right Arrow or Space: Next
    if (e.key === 'ArrowRight' || e.code === 'Space') {
        const nextBtn = document.querySelector('#quiz-next-btn:not(:disabled), #num-next-btn:not(:disabled), #prac-next-btn:not(:disabled), #main-next-btn:not(:disabled)');
        if (nextBtn && document.activeElement !== nextBtn) {
            e.preventDefault();
            nextBtn.click();
            playCockpitBeep('click');
        }
    }

    // Key 'R' for Reveal Answer (in numericals)
    if (key === 'r') {
        const revealAnsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reveal Answer'));
        if (revealAnsBtn && revealAnsBtn.offsetParent !== null) {
            revealAnsBtn.click();
            playCockpitBeep('click');
        }
    }

    // Key 'S' for Reveal Solution (in numericals)
    if (key === 's') {
        const revealSolBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reveal Solution'));
        if (revealSolBtn && revealSolBtn.offsetParent !== null) {
            revealSolBtn.click();
            playCockpitBeep('click');
        }
    }
});

// Global UI helper for question navigation modal
window.openJumpModal = function(totalCount, currentIndex, answersArray, onJumpCallback) {
    let modal = document.getElementById('jump-modal-overlay');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'jump-modal-overlay';
        modal.className = 'jump-modal-overlay';
        modal.innerHTML = `
            <div class="jump-modal-card">
                <div class="jump-modal-header">
                    <h3 style="font-family: var(--font-mono); color: var(--cyan-primary); display: flex; align-items: center; gap: 8px;">
                        <span>RADAR QUESTION MATRIX</span>
                    </h3>
                    <button class="nav-btn" style="padding: 4px 12px;" onclick="closeJumpModal()">✕ CLOSE</button>
                </div>
                <div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 14px;">
                    <span>● <strong style="color: var(--cyan-primary);">Current</strong></span>
                    <span>● <strong style="color: var(--green-cleared);">Answered / Correct</strong></span>
                    <span>● <strong style="color: var(--red-alert);">Incorrect</strong></span>
                </div>
                <div class="jump-grid" id="jump-grid-container"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeJumpModal();
        });
    }

    const grid = document.getElementById('jump-grid-container');
    grid.innerHTML = '';

    for (let i = 0; i < totalCount; i++) {
        const item = document.createElement('div');
        item.className = 'jump-grid-item';
        item.textContent = i + 1;
        if (i === currentIndex) item.classList.add('active');

        if (answersArray && answersArray[i] !== null && answersArray[i] !== undefined) {
            // Check status if available
            item.classList.add('answered-correct');
        }

        item.onclick = () => {
            onJumpCallback(i);
            closeJumpModal();
            playCockpitBeep('click');
        };
        grid.appendChild(item);
    }

    modal.classList.add('active');
};

window.closeJumpModal = function() {
    const modal = document.getElementById('jump-modal-overlay');
    if (modal) modal.classList.remove('active');
};
