class GameManager {
    constructor() {
        this.db = firebase.database();
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.gameState = null;
    }

    // --- HOST METHODS ---

    generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    async createRoom(gameId) {
        this.isHost = true;
        this.roomCode = this.generateRoomCode();

        // Define initial game state
        const roomData = {
            status: 'lobby', // lobby, playing, finished
            gameId: gameId,
            currentQuestion: -1,
            players: {},
            timestamp: Date.now()
        };

        await this.db.ref(`rooms/${this.roomCode}`).set(roomData);
        // Clean up old rooms (optional maintenance)
        return this.roomCode;
    }

    listenToPlayers(callback) {
        if (!this.roomCode) return;
        this.db.ref(`rooms/${this.roomCode}/players`).on('value', (snapshot) => {
            const players = snapshot.val() || {};
            callback(players);
        });
    }

    async startGame() {
        if (!this.roomCode) return;
        await this.db.ref(`rooms/${this.roomCode}`).update({
            status: 'playing',
            currentQuestion: 0,
            startTime: Date.now()
        });
    }

    async nextQuestion(nextIndex) {
        if (!this.roomCode) return;
        await this.db.ref(`rooms/${this.roomCode}`).update({
            currentQuestion: nextIndex,
            startTime: Date.now() // Reset timer for new question
        });
    }

    async endGame() {
        if (!this.roomCode) return;
        await this.db.ref(`rooms/${this.roomCode}`).update({
            status: 'finished'
        });
    }

    // --- PLAYER METHODS ---

    async joinRoom(code, name) {
        const roomRef = this.db.ref(`rooms/${code}`);
        const snapshot = await roomRef.once('value');

        if (!snapshot.exists()) {
            throw new Error("Room not found");
        }

        this.roomCode = code;
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);

        // Add player to room
        await roomRef.child('players').child(this.playerId).set({
            name: name,
            score: 0,
            streak: 0
        });

        return this.playerId;
    }

    async updateProgress(completedCount, score) {
        if (!this.roomCode || !this.playerId) return;

        return this.db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
            completedCount: completedCount,
            score: score,
            lastUpdate: Date.now()
        });
    }

    async setPlayerFinished() {
        if (!this.roomCode || !this.playerId) return;
        return this.db.ref(`rooms/${this.roomCode}/players/${this.playerId}`).update({
            isFinished: true,
            finishedTime: Date.now()
        });
    }

    listenToGameState(callback) {
        if (!this.roomCode) return;
        const ref = this.db.ref(`rooms/${this.roomCode}`);
        ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.gameState = data;
                callback(data);
            }
        });
        return ref;
    }

    async broadcastAction(action) {
        if (!this.roomCode || !this.playerId) return;

        // Push a new message/action to the room's stream
        return this.db.ref(`rooms/${this.roomCode}/stream`).push({
            playerId: this.playerId,
            name: this.gameState?.players[this.playerId]?.name || 'Unknown',
            ...action,
            timestamp: Date.now()
        });
    }

    listenToStream(callback) {
        if (!this.roomCode) return;
        const ref = this.db.ref(`rooms/${this.roomCode}/stream`);
        ref.on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (data) callback(data);
        });
        return ref;
    }

    stopListening(ref) {
        if (ref) ref.off();
    }
}

const gameManager = new GameManager();
