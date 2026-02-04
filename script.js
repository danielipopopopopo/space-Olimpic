document.addEventListener('DOMContentLoaded', () => {
    // Shared: Stars
    if (document.querySelector('.stars-container')) {
        initStars();
    }

    // Page Specific Initialization
    if (document.getElementById('playBtn')) {
        document.body.classList.add('index-page');
        initIndex();
    } else if (document.getElementById('lobbyView')) {
        document.body.classList.add('host-page');
        initHost();
    } else if (document.getElementById('joinScreen')) {
        document.body.classList.add('player-page');
        initPlayer();
    }
});

// --- Shared Functions ---

function createStars(container, count, className, baseOpacity = 1) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = `star ${className}`;
        star.style.left = Math.random() * 110 + '%';
        star.style.top = Math.random() * 110 + '%';

        if (Math.random() > 0.7) {
            star.classList.add('twinkle');
            star.style.setProperty('--duration', (2 + Math.random() * 3) + 's');
            star.style.setProperty('--base-opacity', baseOpacity);
            star.style.animationDelay = Math.random() * 5 + 's';
        }

        container.appendChild(star);
    }
}

function initStars() {
    // Check which stars exist
    const starsBack = document.getElementById('starsBack');
    const starsMid = document.getElementById('starsMid');
    const starsFront = document.getElementById('starsFront');

    if (starsBack) createStars(starsBack, 80, 'star-small', 0.4);
    if (starsMid) createStars(starsMid, 50, 'star-medium', 0.6);
    if (starsFront) createStars(starsFront, 25, 'star-large', 0.8);

    const starsLayers = document.querySelectorAll('.stars-layer');
    if (starsLayers.length > 0) {
        let mouseX = 0, mouseY = 0;
        let currentX = 0, currentY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) / window.innerWidth;
            mouseY = (e.clientY - window.innerHeight / 2) / window.innerHeight;
        });

        function animateStars() {
            currentX += (mouseX - currentX) * 0.05;
            currentY += (mouseY - currentY) * 0.05;

            starsLayers.forEach(layer => {
                const speed = parseFloat(layer.dataset.speed) || 0.05;
                const x = currentX * speed * 100;
                const y = currentY * speed * 100;
                layer.style.transform = `translate(${x}px, ${y}px)`;
            });
            requestAnimationFrame(animateStars);
        }
        animateStars();
    }
}

// --- Index Page Logic ---

function initIndex() {
    const playBtn = document.getElementById('playBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = document.getElementById('closeModal');
    const gameOptions = document.querySelectorAll('.game-option');

    playBtn.addEventListener('click', () => {
        modalOverlay.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    gameOptions.forEach(option => {
        option.addEventListener('click', () => {
            const action = option.dataset.action;
            if (action === 'host') {
                window.location.href = 'host.html';
            } else if (action === 'join') {
                window.location.href = 'player.html';
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            modalOverlay.classList.remove('active');
        }
    });
}

// --- Host Page Logic ---

let hostConnectedPlayers = {};
const totalPuzzles = 7;
let hostTimerInterval;

async function initHost() {
    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('game') || '1';

    // Verify gameManager exists
    if (typeof gameManager === 'undefined') {
        console.error("gameManager not loaded");
        return;
    }

    const code = await gameManager.createRoom(gameType);
    const codeDisplay = document.getElementById('roomCodeDisplay');
    if (codeDisplay) codeDisplay.innerText = code;

    for (let i = 1; i <= 4; i++) {
        const qrEl = document.getElementById(`qr${i}`);
        if (qrEl) {
            const url = `${window.location.origin}/player.html?code=${code}&group=${i}`;
            new QRCode(qrEl, {
                text: url, width: 100, height: 100
            });
        }
    }

    gameManager.listenToPlayers((players) => {
        hostConnectedPlayers = players || {};
        updateLobbyList();
        updateProgressBoard();
    });

    // Listen to bubble stream
    gameManager.listenToStream((action) => {
        if (action.type === 'answer_attempt') {
            // createBubble(action); // Disabled locally in host.html original
        } else if (action.type === 'player_finished') {
            const groupInfo = action.group ? ` מקבוצה ${action.group}` : '';
            showSplashAlert(`🏆 ${action.name}${groupInfo} ניצח! 🏆`);
        }
    });

    // Expose functions to global scope for button onclicks in HTML
    window.startGame = startGame;
    window.finishGame = finishGame;
}

function updateLobbyList() {
    const list = document.getElementById('playersList');
    if (document.getElementById('lobbyView').style.display === 'none') return;
    list.innerHTML = '';
    Object.values(hostConnectedPlayers).forEach(p => {
        const badge = document.createElement('div');
        badge.className = 'player-badge';
        badge.innerHTML = `
            ${p.name}
            ${p.group ? `<span class="group-tag">ק${p.group}</span>` : ''}
        `;
        list.appendChild(badge);
    });
}

function updateProgressBoard() {
    const tbody = document.getElementById('leaderboardBody');
    if (document.getElementById('gameView').style.display === 'none') return;

    const sorted = Object.values(hostConnectedPlayers).sort((a, b) => (b.score || 0) - (a.score || 0));
    tbody.innerHTML = '';
    sorted.forEach(p => {
        const progress = ((p.completedCount || 0) / totalPuzzles) * 100;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 1800;">
                ${p.name} ${p.isFinished ? '✅' : ''}
                ${p.group ? `<br><small style="color: var(--accent); opacity: 0.6;">קבוצה ${p.group}</small>` : ''}
            </td>
            <td>
                <div class="progress-bg">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </td>
            <td style="font-family: 'Orbitron'; color: var(--gold);">${p.score || 0}</td>
        `;
        tbody.appendChild(row);
    });
}

function showSplashAlert(html) {
    const alert = document.getElementById('splashAlert');
    if (!alert) return;
    alert.innerHTML = html;
    alert.classList.remove('show');
    void alert.offsetWidth; // Force reflow
    alert.classList.add('show');
}

function updateHostStopwatch() {
    if (typeof gameManager === 'undefined') return;
    const start = gameManager.gameState?.startTime || Date.now();
    const now = Date.now();
    const diff = now - start;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const ms = Math.floor((diff % 1000) / 100);
    const el = document.getElementById('stopwatch');
    if (el) el.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

function startGame() {
    document.getElementById('lobbyView').style.display = 'none';
    document.getElementById('gameView').style.display = 'block';
    gameManager.startGame();
    updateProgressBoard();

    // Start local stopwatch
    if (hostTimerInterval) clearInterval(hostTimerInterval);
    hostTimerInterval = setInterval(updateHostStopwatch, 100);
}

function finishGame() {
    if (hostTimerInterval) clearInterval(hostTimerInterval);
    if (typeof confetti !== 'undefined') confetti({ particleCount: 300, spread: 150, origin: { y: 0.6 } });

    // Wait a moment for confetti then show podium
    setTimeout(() => {
        showSplashAlert("מחשב תוצאות...");
        setTimeout(() => {
            displayHostPodium();
        }, 2000);
    }, 500);
}

function displayHostPodium() {
    const gameView = document.getElementById('gameView');
    const podiumView = document.getElementById('podiumView');
    const container = document.getElementById('podiumContainer');

    // Aggregate scores by group
    const groupScores = {};
    Object.values(hostConnectedPlayers).forEach(p => {
        const gId = p.group || 'Unassigned';
        if (!groupScores[gId]) {
            groupScores[gId] = { id: gId, score: 0, members: 0 };
        }
        groupScores[gId].score += (p.score || 0);
        groupScores[gId].members++;
    });

    // Convert to array and sort
    const sortedGroups = Object.values(groupScores).sort((a, b) => b.score - a.score);

    const top3 = [sortedGroups[1], sortedGroups[0], sortedGroups[2]]; // Silver, Gold, Bronze

    container.innerHTML = '';
    top3.forEach((g, index) => {
        let rank = 0;
        if (index === 0) rank = 2;
        if (index === 1) rank = 1;
        if (index === 2) rank = 3;

        if (!g) {
            const emptyWrapper = document.createElement('div');
            emptyWrapper.className = 'pedestal-wrapper';
            emptyWrapper.style.visibility = 'hidden';
            container.appendChild(emptyWrapper);
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = `pedestal-wrapper rank-${rank}`;
        const groupName = (g.id === 'Unassigned') ? 'עצמאיים' : `קבוצה ${g.id}`;
        const initial = (g.id === 'Unassigned') ? '?' : g.id;

        wrapper.innerHTML = `
            <div class="player-info">
                <div class="player-name">${groupName}</div>
                <div class="player-score">${g.score} נקודות</div>
            </div>
            <div class="avatar-glow" style="color: currentColor">
                ${rank === 1 ? '<div class="crown">👑</div>' : ''}
                <span>${initial}</span>
            </div>
            <div class="pedestal">
                <div class="rank-num">${rank}</div>
            </div>
        `;
        container.appendChild(wrapper);
    });

    gameView.style.display = 'none';
    podiumView.style.display = 'block';

    setTimeout(() => {
        if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 100, origin: { y: 0.7 } });
    }, 1000);
}

// --- Player Page Logic ---

const allQuestions = [
    { ans: ("30") },
    { ans: ["moon", "לירח"] },
    { ans: ("12") },
    { ans: ("12") },
    { ans: ("24") },
    { ans: ("20") },
    { ans: ("80") },
    { ans: ("8") },
    { ans: ("41") },
    { ans: ("72") },
    { ans: ("9") },
    { ans: ("10") },
    { ans: ("53") },
    { ans: ("חלל") },
    { ans: ("48") },
    { ans: ("56") },
    { ans: ("47") },
    { ans: ("23") }
];

let playerAnsweredQuestions = new Set();
let playerScore = 0;
let playerGroup = null;
let playerConnectedPlayers = {};
let playerTimerInterval;

function initPlayer() {
    // Expose functions for button clicks
    window.joinGame = joinGame;
    window.handleCheck = handleCheck;

    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
        const codeInput = document.getElementById('codeInput');
        if (codeInput) codeInput.value = params.get('code');
    }
    playerGroup = params.get('group') || null;

    const groupSelectEl = document.getElementById('groupSelect');
    const groupButtons = document.querySelectorAll('.group-btn');

    if (!playerGroup && groupSelectEl) {
        groupSelectEl.style.display = 'block';
    }

    groupButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selected = btn.getAttribute('data-group');
            playerGroup = selected;
            groupButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleCheck();
        });
        answerInput.addEventListener('input', e => {
            // Remove English letters (a-z, A-Z) but keep numbers and Hebrew
            e.target.value = e.target.value.replace(/[a-zA-Z]/g, '');
        });
    }
}

async function joinGame() {
    const nameInput = document.getElementById('nameInput');
    const codeInput = document.getElementById('codeInput');
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();

    if (!name || !code) return alert("חסר מידע!");

    const blockedPatterns = ['גלי', 'gali', 'גלגול', 'גליה', 'גל', 'gal', 'גליוש'];
    const nameLower = name.toLowerCase();
    if (blockedPatterns.some(pattern => nameLower.includes(pattern.toLowerCase()))) {
        return alert("השם הזה לא שמיש באתריינו. אנא בחר שם אחר.");
    }

    if (!playerGroup) {
        return alert("אנא בחר קבוצה לפני ההצטרפות.");
    }

    if (typeof gameManager === 'undefined') return console.error('gameManager missing');

    try {
        const playersSnap = await firebase.database().ref(`rooms/${code}/players`).once('value');
        const existingPlayers = playersSnap.val() || {};
        if (Object.values(existingPlayers).some(p => p.name && p.name.toLowerCase() === name.toLowerCase())) {
            return alert("השם הזה כבר תפוס במשחק הזה. אנא בחר שם אחר.");
        }

        await gameManager.joinRoom(code, name, playerGroup);

        // Initial sync
        if (playerGroup) {
            const groupSnap = await firebase.database().ref(`rooms/${code}/groups/${playerGroup}`).once('value');
            const groupData = groupSnap.val();
            if (groupData && groupData.answeredQuestions) {
                playerAnsweredQuestions = new Set(groupData.answeredQuestions);
                playerScore = playerAnsweredQuestions.size * 100;
                gameManager.updateProgress(playerAnsweredQuestions.size, playerScore);
            }
        }

        showPlayerScreen('waitScreen');

        gameManager.listenToGameState((state) => {
            if (state.status === 'playing') showPlayerScreen('puzzleScreen');
            if (state.status === 'finished') {
                showPlayerScreen('endScreen');
                setTimeout(() => displayPlayerPodium(), 3000);
            }
        });

        gameManager.listenToPlayers((players) => {
            playerConnectedPlayers = players || {};
            updateLeaderIndicator();
        });

        if (playerGroup) {
            gameManager.listenToGroupProgress(playerGroup, (data) => {
                if (data && data.answeredQuestions) {
                    const newAnswered = new Set(data.answeredQuestions);
                    if (newAnswered.size > playerAnsweredQuestions.size) {
                        playerAnsweredQuestions = newAnswered;
                        playerScore = playerAnsweredQuestions.size * 100;
                        gameManager.updateProgress(playerAnsweredQuestions.size, playerScore);

                        if (playerAnsweredQuestions.size < allQuestions.length) {
                            updateProgressIndicator();
                        } else {
                            gameManager.setPlayerFinished();
                            showPlayerScreen('endScreen');
                        }
                    }
                }
            });
        }

        gameManager.listenToStream((action) => {
            if (action.type === 'player_finished') {
                const groupInfo = action.group ? ` from Group ${action.group}` : '';
                showSocialSplash(`🏆 ${action.name}${groupInfo} WON! 🏆`);
            }
        });

    } catch (e) { alert(e.message); }
}

function showSocialSplash(html) {
    const alert = document.getElementById('splashAlert');
    if (!alert) return;
    alert.innerHTML = html;
    alert.classList.remove('show');
    void alert.offsetWidth;
    alert.classList.add('show');
}

function normalize(str) {
    if (!str) return "";
    return str.trim().toLowerCase().replace(/[\u200B-\u200D\u200E\u200F\uFEFF]/g, "");
}

function handleCheck() {
    const inputEl = document.getElementById('answerInput');
    const val = inputEl.value;
    if (!val) return;

    const msg = document.getElementById('msg');
    let matchedIndex = -1;

    for (let i = 0; i < allQuestions.length; i++) {
        if (playerAnsweredQuestions.has(i)) continue;
        const q = allQuestions[i];
        const validAnswers = Array.isArray(q.ans) ? q.ans : [q.ans];
        if (validAnswers.some(a => normalize(val) === normalize(a))) {
            matchedIndex = i;
            break;
        }
    }

    if (matchedIndex >= 0) {
        const matchedQ = allQuestions[matchedIndex];
        msg.className = "msg ok";
        msg.textContent = `✔ נכון! (חידה ${matchedIndex + 1})`;
        if (matchedQ.next) setTimeout(() => { msg.textContent = `רמז: ${matchedQ.next}`; }, 1500);

        playerScore += 100;
        playerAnsweredQuestions.add(matchedIndex);

        gameManager.updateProgress(playerAnsweredQuestions.size, playerScore);
        if (playerGroup) {
            gameManager.updateGroupProgress(playerGroup, playerAnsweredQuestions.size, Array.from(playerAnsweredQuestions));
        }

        updateProgressIndicator();
        inputEl.value = '';

        if (playerAnsweredQuestions.size >= allQuestions.length) {
            gameManager.setPlayerFinished();
            gameManager.broadcastAction({ type: 'player_finished', msg: 'finished the mission!' });
            showPlayerScreen('endScreen');
        }
    } else {
        msg.className = "msg bad";
        msg.textContent = "❌ לא נכון";
        setTimeout(() => { msg.textContent = ""; }, 1500);
        gameManager.broadcastAction({ type: 'answer_attempt', text: val, isCorrect: false });
    }
}

function updateProgressIndicator() {
    const indicator = document.getElementById('progressIndicator');
    if (!indicator) return;
    indicator.innerHTML = '';

    allQuestions.forEach((q, index) => {
        const dot = document.createElement('div');
        dot.style.cssText = `width: 12px; height: 12px; border-radius: 50%; transition: all 0.3s var(--spring);`;
        if (playerAnsweredQuestions.has(index)) {
            dot.style.background = 'var(--success)';
            dot.style.boxShadow = '0 0 8px var(--success)';
        } else {
            dot.style.background = 'rgba(255, 255, 255, 0.2)';
            dot.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        }
        indicator.appendChild(dot);
    });

    const qTitle = document.getElementById('qTitle');
    const qDesc = document.getElementById('qDesc');
    if (qTitle) qTitle.textContent = `${playerAnsweredQuestions.size}/${allQuestions.length} חידות`;
    if (qDesc) qDesc.textContent = 'הקלד תשובה לכל חידה - המערכת תבדוק אוטומטית!';
}

function updatePlayerStopwatch() {
    if (typeof gameManager === 'undefined') return;
    const start = gameManager.gameState?.startTime || Date.now();
    const now = Date.now();
    const diff = now - start;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const timerEl = document.getElementById('puzzleTimer');
    if (timerEl) timerEl.innerText = formatted;
    return formatted;
}

function showPlayerScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');

    if (id === 'puzzleScreen') {
        updateProgressIndicator();
        const ansInput = document.getElementById('answerInput');
        if (ansInput) ansInput.focus();
        if (!playerTimerInterval) playerTimerInterval = setInterval(updatePlayerStopwatch, 1000);
    }

    if (id === 'endScreen') {
        if (playerTimerInterval) clearInterval(playerTimerInterval);
        const finalTime = updatePlayerStopwatch();
        const ftDisplay = document.getElementById('finalTimeDisplay');
        if (ftDisplay) ftDisplay.innerText = `הזמן שלך: ${finalTime}`;
    }
}

function displayPlayerPodium() {
    const podiumView = document.getElementById('podiumView');
    const container = document.getElementById('podiumContainer');

    const groupScores = {};
    Object.values(playerConnectedPlayers).forEach(p => {
        const gId = p.group || 'Unassigned';
        if (!groupScores[gId]) groupScores[gId] = { id: gId, score: 0, members: 0 };
        groupScores[gId].score += (p.score || 0);
        groupScores[gId].members++;
    });

    const sortedGroups = Object.values(groupScores).sort((a, b) => b.score - a.score);
    const top3 = [sortedGroups[1], sortedGroups[0], sortedGroups[2]];

    container.innerHTML = '';
    top3.forEach((g, index) => {
        let rank = 0;
        if (index === 0) rank = 2;
        if (index === 1) rank = 1;
        if (index === 2) rank = 3;

        if (!g) {
            const emptyWrapper = document.createElement('div');
            emptyWrapper.className = 'pedestal-wrapper';
            emptyWrapper.style.visibility = 'hidden';
            container.appendChild(emptyWrapper);
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = `pedestal-wrapper rank-${rank}`;
        const groupName = (g.id === 'Unassigned') ? 'עצמאיים' : `קבוצה ${g.id}`;
        const initial = (g.id === 'Unassigned') ? '?' : g.id;

        wrapper.innerHTML = `
            <div class="player-info">
                <div class="player-name">${groupName}</div>
                <div class="player-score">${g.score} נקודות</div>
            </div>
            <div class="avatar-glow" style="color: currentColor">
                ${rank === 1 ? '<div class="crown">👑</div>' : ''}
                <span>${initial}</span>
            </div>
            <div class="pedestal">
                <div class="rank-num">${rank}</div>
            </div>
        `;
        container.appendChild(wrapper);
    });

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (podiumView) {
        podiumView.style.display = 'flex';
        podiumView.classList.add('active');
    }

    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 100, origin: { y: 0.7 } });
}

function updateLeaderIndicator() {
    const indicator = document.getElementById('leadIndicator');
    const textEl = document.getElementById('leadText');
    if (!indicator || !textEl) return;

    const groupScores = {};
    let hasScores = false;

    Object.values(playerConnectedPlayers).forEach(p => {
        const gId = p.group || 'Unassigned';
        if (!groupScores[gId]) groupScores[gId] = { id: gId, score: 0 };
        groupScores[gId].score += (p.score || 0);
        if (p.score > 0) hasScores = true;
    });

    if (!hasScores) {
        indicator.classList.remove('show');
        return;
    }

    const sorted = Object.values(groupScores).sort((a, b) => b.score - a.score);
    const leader = sorted[0];

    if (leader && leader.score > 0) {
        const name = leader.id === 'Unassigned' ? 'עצמאיים' : `ק${leader.id}`;
        textEl.innerText = `${name} (${leader.score})`;
        indicator.classList.add('show');
    } else {
        indicator.classList.remove('show');
    }
}
