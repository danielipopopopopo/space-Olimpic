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

    submitAnswer(answer, timeBonus = 0) {
        if (!this.roomCode || !this.playerId) return;

        // We just record the answer. Validation happens on Host (or verified here if we shared answers)
        // ideally, validation logic is shared or handled securely. 
        // For this simple version, we'll send the answer to the answer bucket for the current question
        return this.db.ref(`rooms/${this.roomCode}/players/${this.playerId}/currentAnswer`).set({
            text: answer,
            timestamp: Date.now()
        });
    }

    listenToGameState(callback) {
        if (!this.roomCode) return;
        this.db.ref(`rooms/${this.roomCode}`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.gameState = data;
                callback(data);
            }
        });
    }
}

const gameManager = new GameManager();
