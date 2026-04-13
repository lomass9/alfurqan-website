const prompts = [
  {
    intro: "Pick the fake skill:",
    a: "I can recite the alphabet backward in under 15 seconds.",
    b: "I once accidentally joined the wrong wedding party photo.",
    fake: "A",
  },
  {
    intro: "Spot the bluff:",
    a: "I have eaten pizza for breakfast three days in a row.",
    b: "I can whistle with two fingers.",
    fake: "B",
  },
  {
    intro: "Which one is made up?",
    a: "I can solve a Rubik's cube in under two minutes.",
    b: "I once named a houseplant after a superhero.",
    fake: "A",
  },
  {
    intro: "Find the fib:",
    a: "I can sleep through alarms and thunder equally well.",
    b: "I once won a dance battle at school.",
    fake: "B",
  },
];

const playersInput = document.getElementById("players");
const targetScoreInput = document.getElementById("targetScore");
const startBtn = document.getElementById("startBtn");
const gameArea = document.getElementById("gameArea");
const scoreboard = document.getElementById("scoreboard");
const scoreList = document.getElementById("scoreList");
const roundTitle = document.getElementById("roundTitle");
const spotlightPlayer = document.getElementById("spotlightPlayer");
const promptText = document.getElementById("promptText");
const choiceButtons = [...document.querySelectorAll(".choice")];
const revealBtn = document.getElementById("revealBtn");
const nextBtn = document.getElementById("nextBtn");
const roundResult = document.getElementById("roundResult");

const state = {
  players: [],
  scores: {},
  target: 8,
  round: 1,
  spotlightIndex: 0,
  selectedChoice: null,
  currentPrompt: null,
};

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function renderScoreboard() {
  scoreList.innerHTML = "";
  state.players
    .slice()
    .sort((p1, p2) => state.scores[p2] - state.scores[p1])
    .forEach((player) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${player}</span><strong>${state.scores[player]} pts</strong>`;
      scoreList.appendChild(li);
    });
}

function renderRound() {
  state.currentPrompt = pickPrompt();
  state.selectedChoice = null;
  roundResult.textContent = "";
  roundTitle.textContent = `Round ${state.round}`;

  const spotlight = state.players[state.spotlightIndex % state.players.length];
  spotlightPlayer.textContent = `Spotlight player: ${spotlight}`;
  promptText.textContent = state.currentPrompt.intro;

  choiceButtons[0].textContent = `A) ${state.currentPrompt.a}`;
  choiceButtons[1].textContent = `B) ${state.currentPrompt.b}`;
  choiceButtons.forEach((btn) => btn.classList.remove("selected"));

  revealBtn.disabled = false;
  nextBtn.classList.add("hidden");
}

function checkWinner() {
  return state.players.find((p) => state.scores[p] >= state.target);
}

function finishGame(winner) {
  roundResult.textContent = `🏆 ${winner} wins Poox with ${state.scores[winner]} points!`;
  revealBtn.disabled = true;
  nextBtn.classList.add("hidden");
}

choiceButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.selectedChoice = btn.dataset.choice;
    choiceButtons.forEach((b) => b.classList.toggle("selected", b === btn));
  });
});

startBtn.addEventListener("click", () => {
  const parsedPlayers = playersInput.value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (parsedPlayers.length < 3) {
    alert("Poox needs at least 3 players.");
    return;
  }

  state.players = shuffle(parsedPlayers);
  state.scores = Object.fromEntries(state.players.map((p) => [p, 0]));
  state.target = Math.max(3, Number(targetScoreInput.value) || 8);
  state.round = 1;
  state.spotlightIndex = 0;

  gameArea.classList.remove("hidden");
  scoreboard.classList.remove("hidden");
  renderScoreboard();
  renderRound();
});

revealBtn.addEventListener("click", () => {
  if (!state.selectedChoice) {
    roundResult.textContent = "Pick A or B first!";
    return;
  }

  const isCorrect = state.selectedChoice === state.currentPrompt.fake;
  const currentPlayer = state.players[state.round % state.players.length];

  if (isCorrect) {
    state.scores[currentPlayer] += 2;
    roundResult.textContent = `Correct! ${currentPlayer} earns 2 points.`;
  } else {
    state.scores[currentPlayer] += 1;
    roundResult.textContent = `Nice try! Fake was ${state.currentPrompt.fake}. ${currentPlayer} gets 1 point for the attempt.`;
  }

  revealBtn.disabled = true;
  nextBtn.classList.remove("hidden");
  renderScoreboard();

  const winner = checkWinner();
  if (winner) {
    finishGame(winner);
  }
});

nextBtn.addEventListener("click", () => {
  if (checkWinner()) return;
  state.round += 1;
  state.spotlightIndex += 1;
  renderRound();
});
