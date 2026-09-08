/**
 * AIR NAVIGATION TERMINAL - NEXT-LEVEL AVIONICS INTERACTIVE CORE
 * Features:
 * 1. Real-Time Zulu (UTC) Clock
 * 2. Web Audio Cockpit Synthesizer (Clicks, Chimes, Warnings, Jet Spool)
 * 3. Cinematic 3D Runway Takeoff Animation Sequence
 * 4. Interactive E6B Flight Computer Modal
 * 5. Digital Pilot Kneeboard / Scratchpad with persistence
 * 6. Cockpit Theme Switcher (EFIS Cyan, Garmin Amber, NVG Night Red)
 * 7. Question Bookmark / Flagging & Radar Matrix
 * 8. Keyboard Shortcuts
 * 9. Ambient ATC Airspace Traffic Layer
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
let soundEnabled = localStorage.getItem('pilot_sound_active') !== 'false'; // Default ON

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
        } else if (type === 'takeoff') {
            // Jet engine spool up sound
            const bufferSize = audioContext.sampleRate * 2.5;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1; // White noise
            }
            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;

            const filter = audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(1200, now + 2.0);
            filter.Q.setValueAtTime(3.0, now);

            const gain = audioContext.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 1.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            // Turbine whine oscillator
            const whine = audioContext.createOscillator();
            whine.type = 'sine';
            whine.frequency.setValueAtTime(180, now);
            whine.frequency.exponentialRampToValueAtTime(850, now + 2.2);

            const whineGain = audioContext.createGain();
            whineGain.gain.setValueAtTime(0.01, now);
            whineGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
            whineGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);

            whine.connect(whineGain);
            whineGain.connect(audioContext.destination);

            noise.start(now);
            whine.start(now);
            noise.stop(now + 2.5);
            whine.stop(now + 2.5);
        }
    } catch (e) {
        // Silent fallback
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

// ==========================================
// 3. COCKPIT COLOR THEME SWITCHER
// ==========================================
const availableThemes = ['default', 'theme-amber', 'theme-night'];
let currentTheme = localStorage.getItem('cockpit_theme') || 'default';

function applyCockpitTheme(themeName) {
    document.body.classList.remove('theme-amber', 'theme-night');
    if (themeName !== 'default') {
        document.body.classList.add(themeName);
    }
    currentTheme = themeName;
    localStorage.setItem('cockpit_theme', themeName);

    const themeLabels = {
        'default': 'EFIS CYAN',
        'theme-amber': 'GARMIN AMBER',
        'theme-night': 'NVG RED'
    };

    document.querySelectorAll('.theme-toggle-label').forEach(el => {
        el.textContent = themeLabels[themeName] || 'EFIS CYAN';
    });
}

function cycleCockpitTheme() {
    const nextIdx = (availableThemes.indexOf(currentTheme) + 1) % availableThemes.length;
    applyCockpitTheme(availableThemes[nextIdx]);
    playCockpitBeep('click');
}

// ==========================================
// 4. CINEMATIC 3D RUNWAY TAKEOFF ANIMATION
// ==========================================
function launchTakeoffSequence(onComplete) {
    let overlay = document.getElementById('takeoff-cinema-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'takeoff-cinema-overlay';
        overlay.className = 'takeoff-overlay';
        overlay.innerHTML = `
            <button class="skip-takeoff-btn" onclick="skipTakeoff()">SKIP TAKEOFF [ESC / SPACE] →</button>
            
            <!-- 3D Runway Perspective Stage -->
            <div class="runway-perspective-stage">
                <div class="runway-stripes"></div>
                <div class="runway-lights-row">
                    <div class="runway-light-dot"></div>
                    <div class="runway-light-dot"></div>
                    <div class="runway-light-dot"></div>
                    <div class="runway-light-dot"></div>
                </div>
            </div>

            <!-- Supersonic Aircraft in Takeoff -->
            <div class="takeoff-jet-container">
                <svg class="jet-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="jetFuselage" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#38bdf8"/>
                            <stop offset="50%" stop-color="#0284c7"/>
                            <stop offset="100%" stop-color="#0f172a"/>
                        </linearGradient>
                    </defs>
                    <!-- Wings & Fuselage -->
                    <path d="M100 5 L112 45 L185 85 L180 95 L114 80 L115 130 L135 145 L130 152 L100 144 L70 152 L65 145 L85 130 L86 80 L20 95 L15 85 L88 45 Z" fill="url(#jetFuselage)" stroke="#00d2ff" stroke-width="1.5" />
                    <!-- Cockpit Canopy -->
                    <ellipse cx="100" cy="35" rx="5" ry="16" fill="#00d2ff" opacity="0.8" />
                    <!-- Wingtip Navigation Lights (Red Port, Green Starboard) -->
                    <circle cx="17" cy="90" r="3" fill="#ef4444" />
                    <circle cx="183" cy="90" r="3" fill="#10b981" />
                </svg>

                <div class="jet-contrail-left"></div>
                <div class="jet-contrail-right"></div>

                <!-- Twin Afterburner Plumes -->
                <div class="afterburner-plumes">
                    <div class="plume"></div>
                    <div class="plume"></div>
                </div>
            </div>

            <!-- Diagnostics Telemetry Console -->
            <div class="takeoff-telemetry-box">
                <div class="telemetry-title">
                    <span>FLIGHT DECK INITIALIZATION SEQUENCE</span>
                    <span style="color: var(--green-cleared);">ALL SYSTEMS GO</span>
                </div>
                <div class="telemetry-lines" id="takeoff-telemetry-lines">
                    <div>[SYS] PRIMARY FLIGHT DISPLAY (PFD) BOOT... OK</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    overlay.classList.add('active');
    playCockpitBeep('takeoff');

    const telemetryLines = [
        "[00:00:01] PRIMARY FLIGHT DISPLAY (PFD) BOOT... OK",
        "[00:00:02] ATTITUDE HEADING REFERENCE SYSTEM (AHRS)... CALIBRATED",
        "[00:00:03] TCAS II & ADS-B AIRSPACE SCANNER... CLEAR",
        "[00:00:04] DGCA CPL/ATPL FLIGHT MATRIX... 828 MODULES ONLINE",
        "[00:00:05] CLEARED FOR DEPARTURE RUNWAY 28L // CLIMB UNRESTRICTED"
    ];

    const linesBox = document.getElementById('takeoff-telemetry-lines');
    linesBox.innerHTML = '';
    telemetryLines.forEach((line, index) => {
        setTimeout(() => {
            const div = document.createElement('div');
            div.textContent = line;
            linesBox.appendChild(div);
            playCockpitBeep('click');
        }, (index + 1) * 450);
    });

    window.takeoffTimeout = setTimeout(() => {
        finishTakeoff(onComplete);
    }, 3200);

    window.skipTakeoff = function() {
        if (window.takeoffTimeout) clearTimeout(window.takeoffTimeout);
        finishTakeoff(onComplete);
    };
}

function finishTakeoff(onComplete) {
    const overlay = document.getElementById('takeoff-cinema-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    playCockpitBeep('correct');
    if (typeof onComplete === 'function') onComplete();
}

// ==========================================
// 5. INTERACTIVE E6B FLIGHT COMPUTER MODAL
// ==========================================
function openE6BModal() {
    let modal = document.getElementById('e6b-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'e6b-modal';
        modal.className = 'e6b-modal-overlay';
        modal.innerHTML = `
            <div class="e6b-card">
                <div class="jump-modal-header">
                    <h3 style="font-family: var(--font-mono); color: var(--cyan-primary); display: flex; align-items: center; gap: 8px;">
                        <span>E6B DIGITAL FLIGHT COMPUTER</span>
                    </h3>
                    <button class="nav-btn" style="padding: 4px 12px;" onclick="closeE6BModal()">✕ CLOSE</button>
                </div>

                <div class="e6b-tabs">
                    <button class="e6b-tab-btn active" onclick="switchE6BTab('tab-1in60', this)">1 in 60 Rule</button>
                    <button class="e6b-tab-btn" onclick="switchE6BTab('tab-descent', this)">Descent & TOD</button>
                    <button class="e6b-tab-btn" onclick="switchE6BTab('tab-departure', this)">Departure & Conv</button>
                    <button class="e6b-tab-btn" onclick="switchE6BTab('tab-wind', this)">Crosswind</button>
                </div>

                <!-- Tab 1: 1 in 60 Rule -->
                <div id="tab-1in60" class="e6b-tab-content active">
                    <div class="calc-grid">
                        <div class="calc-field">
                            <label>Distance Off Track (NM)</label>
                            <input type="number" id="e6b-off-dist" value="4" oninput="calc1in60()">
                        </div>
                        <div class="calc-field">
                            <label>Distance Flown (NM)</label>
                            <input type="number" id="e6b-flown-dist" value="40" oninput="calc1in60()">
                        </div>
                    </div>
                    <div class="calc-result-box" id="e6b-1in60-res">
                        <span>Track Error (TE):</span>
                        <strong id="res-te">6.0°</strong>
                    </div>
                </div>

                <!-- Tab 2: Descent & TOD -->
                <div id="tab-descent" class="e6b-tab-content">
                    <div class="calc-grid">
                        <div class="calc-field">
                            <label>Altitude to Lose (Feet)</label>
                            <input type="number" id="e6b-alt-lose" value="24000" oninput="calcDescent()">
                        </div>
                        <div class="calc-field">
                            <label>Groundspeed (Knots)</label>
                            <input type="number" id="e6b-gs" value="280" oninput="calcDescent()">
                        </div>
                    </div>
                    <div class="calc-result-box">
                        <span>Top of Descent (TOD):</span>
                        <strong id="res-tod">80.0 NM out</strong>
                    </div>
                    <div class="calc-result-box" style="margin-top: 8px;">
                        <span>Rate of Descent (3° Slope):</span>
                        <strong id="res-rod">1,400 FT/MIN</strong>
                    </div>
                </div>

                <!-- Tab 3: Departure & Convergency -->
                <div id="tab-departure" class="e6b-tab-content">
                    <div class="calc-grid">
                        <div class="calc-field">
                            <label>Change of Longitude (°)</label>
                            <input type="number" id="e6b-dlong" value="10" oninput="calcDepConv()">
                        </div>
                        <div class="calc-field">
                            <label>Mean Latitude (°)</label>
                            <input type="number" id="e6b-meanlat" value="60" oninput="calcDepConv()">
                        </div>
                    </div>
                    <div class="calc-result-box">
                        <span>Departure Distance:</span>
                        <strong id="res-dep">300.0 NM</strong>
                    </div>
                    <div class="calc-result-box" style="margin-top: 8px;">
                        <span>Earth Convergency:</span>
                        <strong id="res-conv">8.66°</strong>
                    </div>
                </div>

                <!-- Tab 4: Crosswind Resolver -->
                <div id="tab-wind" class="e6b-tab-content">
                    <div class="calc-grid">
                        <div class="calc-field">
                            <label>Runway Heading (°)</label>
                            <input type="number" id="e6b-rwy" value="280" oninput="calcWind()">
                        </div>
                        <div class="calc-field">
                            <label>Wind Direction (°)</label>
                            <input type="number" id="e6b-winddir" value="310" oninput="calcWind()">
                        </div>
                        <div class="calc-field">
                            <label>Wind Speed (Knots)</label>
                            <input type="number" id="e6b-windspd" value="25" oninput="calcWind()">
                        </div>
                    </div>
                    <div class="calc-result-box">
                        <span>Headwind Component:</span>
                        <strong id="res-hw">21.7 Knots</strong>
                    </div>
                    <div class="calc-result-box" style="margin-top: 8px;">
                        <span>Crosswind Component:</span>
                        <strong id="res-xw">12.5 Knots (Right)</strong>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeE6BModal();
        });
    }

    modal.classList.add('active');
    playCockpitBeep('click');
}

function closeE6BModal() {
    const modal = document.getElementById('e6b-modal');
    if (modal) modal.classList.remove('active');
    playCockpitBeep('click');
}

function switchE6BTab(tabId, btn) {
    document.querySelectorAll('.e6b-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.e6b-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    playCockpitBeep('click');
}

// E6B Calculations
function calc1in60() {
    const off = parseFloat(document.getElementById('e6b-off-dist').value) || 0;
    const flown = parseFloat(document.getElementById('e6b-flown-dist').value) || 1;
    const te = ((off / flown) * 60).toFixed(1);
    document.getElementById('res-te').textContent = `${te}°`;
}

function calcDescent() {
    const alt = parseFloat(document.getElementById('e6b-alt-lose').value) || 0;
    const gs = parseFloat(document.getElementById('e6b-gs').value) || 0;
    const tod = (alt / 300).toFixed(1);
    const rod = Math.round(gs * 5);
    document.getElementById('res-tod').textContent = `${tod} NM out`;
    document.getElementById('res-rod').textContent = `${rod} FT/MIN`;
}

function calcDepConv() {
    const dlong = parseFloat(document.getElementById('e6b-dlong').value) || 0;
    const lat = parseFloat(document.getElementById('e6b-meanlat').value) || 0;
    const rad = (lat * Math.PI) / 180;
    const dep = ((dlong * 60) * Math.cos(rad)).toFixed(1);
    const conv = (dlong * Math.sin(rad)).toFixed(2);
    document.getElementById('res-dep').textContent = `${dep} NM`;
    document.getElementById('res-conv').textContent = `${conv}°`;
}

function calcWind() {
    const rwy = parseFloat(document.getElementById('e6b-rwy').value) || 0;
    const dir = parseFloat(document.getElementById('e6b-winddir').value) || 0;
    const spd = parseFloat(document.getElementById('e6b-windspd').value) || 0;
    const angle = ((dir - rwy) * Math.PI) / 180;
    const hw = (spd * Math.cos(angle)).toFixed(1);
    const xw = (spd * Math.sin(angle)).toFixed(1);
    document.getElementById('res-hw').textContent = `${Math.abs(hw)} Knots (${hw >= 0 ? 'Headwind' : 'Tailwind'})`;
    document.getElementById('res-xw').textContent = `${Math.abs(xw)} Knots (${xw >= 0 ? 'from Right' : 'from Left'})`;
}

// ==========================================
// 6. PILOT DIGITAL KNEEBOARD / SCRATCHPAD
// ==========================================
function toggleKneeboard() {
    let drawer = document.getElementById('kneeboard-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'kneeboard-drawer';
        drawer.className = 'kneeboard-drawer';
        drawer.innerHTML = `
            <div class="kneeboard-header">
                <div style="font-family: var(--font-mono); color: var(--gold-accent); font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>📋 PILOT DIGITAL KNEEBOARD</span>
                </div>
                <button class="nav-btn" style="padding: 4px 10px;" onclick="toggleKneeboard()">✕</button>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px; font-family: var(--font-mono);">
                Use for rough calculations, runway headings, and navigation logs. Auto-saved locally.
            </div>
            <textarea id="kneeboard-text" class="kneeboard-textarea" placeholder="Enter flight calculations, headings, PNR notes..."></textarea>
            <div style="margin-top: 12px; display: flex; justify-content: space-between;">
                <button class="nav-btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="clearKneeboard()">Clear Log</button>
                <span style="font-size: 0.75rem; color: var(--green-cleared); font-family: var(--font-mono); align-self: center;">● SAVED</span>
            </div>
        `;
        document.body.appendChild(drawer);

        const textarea = document.getElementById('kneeboard-text');
        textarea.value = localStorage.getItem('pilot_kneeboard_notes') || '';
        textarea.addEventListener('input', () => {
            localStorage.setItem('pilot_kneeboard_notes', textarea.value);
        });
    }

    drawer.classList.toggle('open');
    playCockpitBeep('click');
}

function clearKneeboard() {
    const textarea = document.getElementById('kneeboard-text');
    if (textarea) {
        textarea.value = '';
        localStorage.removeItem('pilot_kneeboard_notes');
        playCockpitBeep('click');
    }
}

// ==========================================
// 7. QUESTION BOOKMARKING & RADAR MATRIX
// ==========================================
let flaggedQuestions = new Set(JSON.parse(localStorage.getItem('pilot_flagged_q') || '[]'));

function toggleFlagCurrentQuestion(qIndex) {
    if (flaggedQuestions.has(qIndex)) {
        flaggedQuestions.delete(qIndex);
    } else {
        flaggedQuestions.add(qIndex);
    }
    localStorage.setItem('pilot_flagged_q', JSON.stringify(Array.from(flaggedQuestions)));
    updateFlagButtonUI(qIndex);
    playCockpitBeep('click');
}

function updateFlagButtonUI(qIndex) {
    const btn = document.getElementById('flag-q-btn');
    if (btn) {
        if (flaggedQuestions.has(qIndex)) {
            btn.classList.add('is-flagged');
            btn.innerHTML = `<span>🚩 FLAGGED</span>`;
        } else {
            btn.classList.remove('is-flagged');
            btn.innerHTML = `<span>⚐ FLAG FOR REVIEW</span>`;
        }
    }
}

// Enhanced Question Jump Modal with Filter Tabs
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
                <div class="jump-filters-row">
                    <button class="jump-filter-btn active" onclick="filterJumpMatrix('all')">All Questions</button>
                    <button class="jump-filter-btn" onclick="filterJumpMatrix('answered')">Answered</button>
                    <button class="jump-filter-btn" onclick="filterJumpMatrix('unanswered')">Unanswered</button>
                    <button class="jump-filter-btn" onclick="filterJumpMatrix('flagged')">🚩 Flagged</button>
                </div>
                <div class="jump-grid" id="jump-grid-container"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeJumpModal();
        });
    }

    window.jumpMatrixData = { totalCount, currentIndex, answersArray, onJumpCallback, filter: 'all' };
    renderJumpGrid();
    modal.classList.add('active');
    playCockpitBeep('click');
};

function renderJumpGrid() {
    const { totalCount, currentIndex, answersArray, onJumpCallback, filter } = window.jumpMatrixData;
    const grid = document.getElementById('jump-grid-container');
    grid.innerHTML = '';

    for (let i = 0; i < totalCount; i++) {
        const isAnswered = answersArray && answersArray[i] !== null && answersArray[i] !== undefined;
        const isFlagged = flaggedQuestions.has(i);

        if (filter === 'answered' && !isAnswered) continue;
        if (filter === 'unanswered' && isAnswered) continue;
        if (filter === 'flagged' && !isFlagged) continue;

        const item = document.createElement('div');
        item.className = 'jump-grid-item';
        item.textContent = i + 1;
        if (i === currentIndex) item.classList.add('active');
        if (isAnswered) item.classList.add('answered-correct');
        if (isFlagged) item.classList.add('flagged');

        item.onclick = () => {
            onJumpCallback(i);
            closeJumpModal();
            playCockpitBeep('click');
        };
        grid.appendChild(item);
    }
}

window.filterJumpMatrix = function(filterMode) {
    document.querySelectorAll('.jump-filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    window.jumpMatrixData.filter = filterMode;
    renderJumpGrid();
    playCockpitBeep('click');
};

window.closeJumpModal = function() {
    const modal = document.getElementById('jump-modal-overlay');
    if (modal) modal.classList.remove('active');
    playCockpitBeep('click');
};

// ==========================================
// 8. KEYBOARD SHORTCUTS ENGINE
// ==========================================
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    // Option keys 1..4 or A..D
    if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(key)) {
        let optIndex = -1;
        if (key === '1' || key === 'a') optIndex = 0;
        else if (key === '2' || key === 'b') optIndex = 1;
        else if (key === '3' || key === 'c') optIndex = 2;
        else if (key === '4' || key === 'd') optIndex = 3;

        const quizBtns = document.querySelectorAll('#quiz-options-container .option-btn, #quiz-options .option-btn, #quiz-options .mcq-option');
        if (quizBtns.length > optIndex && !quizBtns[optIndex].disabled && !quizBtns[optIndex].classList.contains('disabled')) {
            quizBtns[optIndex].click();
        }
    }

    // Left Arrow: Previous
    if (e.key === 'ArrowLeft') {
        const prevBtn = document.querySelector('#quiz-prev-btn:not(:disabled), #num-prev-btn:not(:disabled), #prac-prev-btn:not(:disabled), #main-prev-btn:not(:disabled)');
        if (prevBtn) prevBtn.click();
    }

    // Right Arrow or Space: Next
    if (e.key === 'ArrowRight' || e.code === 'Space') {
        const nextBtn = document.querySelector('#quiz-next-btn:not(:disabled), #num-next-btn:not(:disabled), #prac-next-btn:not(:disabled), #main-next-btn:not(:disabled)');
        if (nextBtn && document.activeElement !== nextBtn) {
            e.preventDefault();
            nextBtn.click();
        }
    }

    // Key 'R': Reveal Answer
    if (key === 'r') {
        const revealAnsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reveal Answer'));
        if (revealAnsBtn && revealAnsBtn.offsetParent !== null) revealAnsBtn.click();
    }

    // Key 'S': Reveal Solution
    if (key === 's') {
        const revealSolBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reveal Step-by-Step Solution'));
        if (revealSolBtn && revealSolBtn.offsetParent !== null) revealSolBtn.click();
    }

    // Key 'F': Flag Question
    if (key === 'f') {
        const flagBtn = document.getElementById('flag-q-btn');
        if (flagBtn && flagBtn.offsetParent !== null) flagBtn.click();
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
        closeJumpModal();
        closeE6BModal();
        const drawer = document.getElementById('kneeboard-drawer');
        if (drawer && drawer.classList.contains('open')) toggleKneeboard();
        if (window.skipTakeoff) window.skipTakeoff();
    }
});

// ==========================================
// 9. AMBIENT AIRSPACE TRAFFIC INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateSoundToggleUI();
    applyCockpitTheme(currentTheme);

    // Create ambient radar traffic layer in background
    if (!document.querySelector('.ambient-traffic-layer')) {
        const trafficLayer = document.createElement('div');
        trafficLayer.className = 'ambient-traffic-layer';
        trafficLayer.innerHTML = `
            <div class="traffic-aircraft">
                <svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                <span>AIC 101 [FL360 / 485 KT]</span>
            </div>
            <div class="traffic-aircraft-2">
                <svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                <span>IGO 744 [FL340 / 450 KT]</span>
            </div>
        `;
        document.body.prepend(trafficLayer);
    }
});
