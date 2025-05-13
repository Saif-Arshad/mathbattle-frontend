const socket = io('http://localhost:8000', {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    cors: {
        origin: "*",
        credentials: true
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    if (socket.io.engine.transport.name === 'websocket') {
        socket.io.engine.transport.name = 'polling';
        socket.connect();
    }
});

socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected on attempt:', attemptNumber);
});

const loginScreen = document.getElementById('login-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const playerNameInput = document.getElementById('player-name');
const joinButton = document.getElementById('join-btn');
const questionDisplay = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-btn');
const playerScore = document.getElementById('player-score');
const opponentScore = document.getElementById('opponent-score');
const resultMessage = document.getElementById('result-message');
const playAgainButton = document.getElementById('play-again-btn');
const timerBar = document.getElementById('timer-bar');

let currentPlayer = null;
let gameRoom = null;
let gameActive = false;

joinButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        currentPlayer = playerName;
        socket.emit('join_queue', { name: playerName });
        loginScreen.classList.add('hidden');
        waitingScreen.classList.remove('hidden');
    }
});

submitButton.addEventListener('click', submitAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

playAgainButton.addEventListener('click', () => {
    resultsScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    resetGame();
});

function submitAnswer() {
    if (!gameActive) return;
    
    const answer = answerInput.value.trim();
    if (answer === '') return;
    
    socket.emit('submit_answer', {
        answer: parseInt(answer),
        room: gameRoom
    });
    
    answerInput.value = '';
}

function resetGame() {
    gameActive = false;
    gameRoom = null;
    playerScore.textContent = '0';
    opponentScore.textContent = '0';
    questionDisplay.textContent = '';
    answerInput.value = '';
}

socket.on('game_start', (data) => {
    waitingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameRoom = data.room;
    gameActive = true;
    questionDisplay.textContent = data.question;
    
    timerBar.style.animation = 'none';
    timerBar.offsetHeight; 
    timerBar.style.animation = null;
    
    setTimeout(() => {
        if (gameActive) {
            socket.emit('game_over', { room: gameRoom });
        }
    }, 60000);
});

socket.on('score_update', (data) => {
    const scores = data.scores;
    const players = Object.keys(scores);
    
    if (players[0] === socket.id) {
        playerScore.textContent = scores[players[0]];
        opponentScore.textContent = scores[players[1]];
    } else {
        playerScore.textContent = scores[players[1]];
        opponentScore.textContent = scores[players[0]];
    }
    
    questionDisplay.textContent = data.question;
});

socket.on('wrong_answer', () => {
    answerInput.classList.add('border-red-500');
    setTimeout(() => {
        answerInput.classList.remove('border-red-500');
    }, 500);
});

socket.on('game_results', (data) => {
    gameActive = false;
    gameScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
    
    const scores = data.scores;
    const players = Object.keys(scores);
    const playerIdx = players.indexOf(socket.id);
    const playerFinalScore = scores[players[playerIdx]];
    const opponentFinalScore = scores[players[1 - playerIdx]];
    
    if (data.winner === 'draw') {
        resultMessage.textContent = `Game Over! It's a draw! (${playerFinalScore} - ${opponentFinalScore})`;
    } else if (data.winner === socket.id) {
        resultMessage.textContent = `Congratulations! You won! (${playerFinalScore} - ${opponentFinalScore})`;
    } else {
        resultMessage.textContent = `Better luck next time! You lost. (${playerFinalScore} - ${opponentFinalScore})`;
    }
});

socket.on('opponent_disconnected', () => {
    gameActive = false;
    gameScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
    resultMessage.textContent = 'Your opponent disconnected. You win!';
}); 