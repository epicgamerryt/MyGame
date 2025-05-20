// script.js

// ─────────────────────────────────────────────────
// 1. Constants & Global State
// ─────────────────────────────────────────────────
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A"
];

let deck = [];
let communityCards = [];

// player array: index 0 is human, 1–4 are CPUs
let players = [
  { id: "you", chips: 1000, hand: [], isCPU: false },
  { id: "cpu-1", chips: 1000, hand: [], isCPU: true },
  { id: "cpu-2", chips: 1000, hand: [], isCPU: true },
  { id: "cpu-3", chips: 1000, hand: [], isCPU: true },
  { id: "cpu-4", chips: 1000, hand: [], isCPU: true }
];

let gameState = {
  dealerIndex: 0,       // rotates each hand (0..4)
  smallBlind: 10,
  bigBlind: 20,
  currentBet: 0,        // the amount everyone must at least call to stay in
  minimumRaise: 0,      // smallest allowed raise amount
  pot: 0,
  playerBets: [0, 0, 0, 0, 0],      // how much each player has put in this betting round
  activePlayers: [true, true, true, true, true], // whether each player is still “in” (not folded)
  currentPlayer: null,  // index (0–4) of whoever’s turn it is
  lastRaiser: null,     // index of the player who last raised (to know when to stop)
  phase: "preflop"      // phases: preflop, flop, turn, river, showdown
};

// ─────────────────────────────────────────────────
// 2. DOM References
// ─────────────────────────────────────────────────
const potDisplay = document.getElementById("pot-amount");
const dealButton = document.getElementById("btn-deal");
const foldBtn = document.getElementById("btn-fold");
const callBtn = document.getElementById("btn-call");
const raiseBtn = document.getElementById("btn-raise");
const raiseInput = document.getElementById("raise-amount");

// Hole‐card slots (human)
const playerCard1 = document.getElementById("player-card-1");
const playerCard2 = document.getElementById("player-card-2");

// CPU chip counts
const cpuChipDisplays = [
  document.getElementById("chips-cpu-1"),
  document.getElementById("chips-cpu-2"),
  document.getElementById("chips-cpu-3"),
  document.getElementById("chips-cpu-4")
];
// Human chip display
const humanChipsDisplay = document.getElementById("chips-you");

// Community card slots
const commSlots = [
  document.getElementById("comm-1"),
  document.getElementById("comm-2"),
  document.getElementById("comm-3"),
  document.getElementById("comm-4"),
  document.getElementById("comm-5")
];

// ─────────────────────────────────────────────────
// 3. Deck‐Related Helpers
// ─────────────────────────────────────────────────
function createDeck() {
  deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealHoleCards() {
  // clear previous hands
  for (let p of players) {
    p.hand = [];
  }
  // each player gets 2 cards
  for (let p of players) {
    p.hand.push(deck.pop(), deck.pop());
  }
}

function renderHoleCards() {
  // Human: show rank+suit
  const human = players[0];

  // --- Card 1 ---
  const card1 = human.hand[0];
  const cardDiv1 = document.getElementById("player-card-1");
  cardDiv1.textContent = card1.rank + card1.suit;
  if (card1.suit === "♥" || card1.suit === "♦") cardDiv1.classList.add("red");
  else cardDiv1.classList.remove("red");

  // --- Card 2 ---
  const card2 = human.hand[1];
  const cardDiv2 = document.getElementById("player-card-2");
  cardDiv2.textContent = card2.rank + card2.suit;
  if (card2.suit === "♥" || card2.suit === "♦") cardDiv2.classList.add("red");
  else cardDiv2.classList.remove("red");

  // CPUs: leave facedown for now
}

// ─────────────────────────────────────────────────
// 4. UI‐Update Helpers
// ─────────────────────────────────────────────────
function updatePotUI() {
  potDisplay.textContent = gameState.pot;
}

function updateChipsUI() {
  // Update human chip count
  humanChipsDisplay.textContent = players[0].chips;

  // Update each CPU's chip count
  for (let i = 1; i < players.length; i++) {
    const idx = i - 1; // cpuChipDisplays is length‐4, corresponds to players[1..4]
    cpuChipDisplays[idx].textContent = players[i].chips;
  }
}

function setActionButtonsEnabled(isEnabled) {
  foldBtn.disabled = !isEnabled;
  callBtn.disabled = !isEnabled;
  raiseBtn.disabled = !isEnabled;
  raiseInput.disabled = !isEnabled;
}

// ─────────────────────────────────────────────────
// 5. Blinds & Starting a New Hand
// ─────────────────────────────────────────────────
function resetTable() {
  // 1) Build & shuffle deck
  createDeck();
  shuffleDeck();

  // 1.5) Hide CPU Hands
  hideCPUHands();

  // 2) Clear community card slots
  communityCards = [];
  for (let slot of commSlots) {
    slot.textContent = "";
  }

  // 3) Reset betting state
  gameState.pot = 0;
  gameState.playerBets = [0, 0, 0, 0, 0];
  gameState.activePlayers = [true, true, true, true, true];
  gameState.currentBet = 0;
  gameState.phase = "preflop";

  // 4) Rotate dealer button (optional)
  // gameState.dealerIndex = (gameState.dealerIndex + 1) % players.length;

  // 5) Deal hole cards
  dealHoleCards();
  renderHoleCards();

  // 6) Post blinds
  postBlinds();

  // 7) Start preflop betting
  startBettingRound();
}

function postBlinds() {
  const sbIndex = (gameState.dealerIndex + 1) % players.length;
  const bbIndex = (gameState.dealerIndex + 2) % players.length;

  // Deduct small blind
  players[sbIndex].chips -= gameState.smallBlind;
  gameState.playerBets[sbIndex] = gameState.smallBlind;

  // Deduct big blind
  players[bbIndex].chips -= gameState.bigBlind;
  gameState.playerBets[bbIndex] = gameState.bigBlind;

  // Initialize pot and currentBet
  gameState.pot = gameState.smallBlind + gameState.bigBlind;
  gameState.currentBet = gameState.bigBlind;
  gameState.minimumRaise = gameState.bigBlind; // minimum raise size = big blind

  updateChipsUI();
  updatePotUI();
}

// ─────────────────────────────────────────────────
// 6. Betting‐Round Logic (Single Round: Preflop only)
// ─────────────────────────────────────────────────
function startBettingRound() {
  // Who acts first? The player AFTER the big blind.
  const bbIndex = (gameState.dealerIndex + 2) % players.length;
  gameState.lastRaiser = bbIndex; // if nobody raises, betting ends when we circle back here
  gameState.currentPlayer = (bbIndex + 1) % players.length;

  promptNextAction();
}

// Prompt whoever’s turn it is—if CPU, run cpuAction(), if human, enable buttons.
function promptNextAction() {
  // Skip folded players
  while (!gameState.activePlayers[gameState.currentPlayer]) {
    gameState.currentPlayer = (gameState.currentPlayer + 1) % players.length;
  }

  // Check: have we looped back to lastRaiser?
  if (gameState.currentPlayer === gameState.lastRaiser) {
    // End this betting round
    finishBettingRound();
    return;
  }

  const pIdx = gameState.currentPlayer;
  if (players[pIdx].isCPU) {
    // Disable human buttons during CPU turn
    setActionButtonsEnabled(false);
    setTimeout(() => cpuAction(pIdx), 500); // small delay for UX
  } else {
    // It's human's turn
    setActionButtonsEnabled(true);
    updateButtonsLabelAndCallAmount();
  }
}

// Very simple CPU: if they have enough chips to call, they call; otherwise they go fold.
function cpuAction(cpuIndex) {
  const requiredToCall = gameState.currentBet - gameState.playerBets[cpuIndex];

  if (players[cpuIndex].chips > requiredToCall) {
    // CPU calls
    players[cpuIndex].chips -= requiredToCall;
    gameState.playerBets[cpuIndex] += requiredToCall;
    gameState.pot += requiredToCall;
    console.log(`${players[cpuIndex].id} CALLS ${requiredToCall}`);
  } else {
    // CPU folds
    gameState.activePlayers[cpuIndex] = false;
    console.log(`${players[cpuIndex].id} FOLDS`);
  }

  updateChipsUI();
  updatePotUI();

  // Advance to next
  gameState.currentPlayer = (cpuIndex + 1) % players.length;
  promptNextAction();
}

// End of betting—disable buttons, log, deal flop/turn/river, then showdown
function finishBettingRound() {
  console.log("=== Betting round over ===");
  setActionButtonsEnabled(false);

  proceedToNextPhase();
}

// ─────────────────────────────────────────────────
// 7. Human Button Handlers
// ─────────────────────────────────────────────────
function updateButtonsLabelAndCallAmount() {
  const humanIdx = 0;
  const toCall = gameState.currentBet - gameState.playerBets[humanIdx];
  callBtn.textContent = toCall > 0 ? `Call (${toCall})` : "Check";
}

// Human folds
foldBtn.addEventListener("click", () => {
  const humanIdx = 0;
  gameState.activePlayers[humanIdx] = false;
  console.log("You FOLD");
  setActionButtonsEnabled(false);

  // Move to next player
  gameState.currentPlayer = (humanIdx + 1) % players.length;
  promptNextAction();
});

// Human calls/checks
callBtn.addEventListener("click", () => {
  const humanIdx = 0;
  const toCall = gameState.currentBet - gameState.playerBets[humanIdx];

  if (toCall > 0) {
    // Deduct chips and add to pot
    players[humanIdx].chips -= toCall;
    gameState.playerBets[humanIdx] += toCall;
    gameState.pot += toCall;
    console.log(`You CALL ${toCall}`);
  } else {
    console.log("You CHECK");
  }

  updateChipsUI();
  updatePotUI();
  setActionButtonsEnabled(false);

  // Advance
  gameState.currentPlayer = (humanIdx + 1) % players.length;
  promptNextAction();
});

// Human raises
raiseBtn.addEventListener("click", () => {
  const humanIdx = 0;
  const raiseAmount = parseInt(raiseInput.value, 10);

  if (isNaN(raiseAmount) || raiseAmount < gameState.minimumRaise) {
    alert(`Minimum raise is ${gameState.minimumRaise}`);
    return;
  }

  // New total bet this round for human = currentBet + raiseAmount
  const newBet = gameState.currentBet + raiseAmount;
  const toCall = newBet - gameState.playerBets[humanIdx];

  if (players[humanIdx].chips < toCall) {
    alert("You don’t have enough chips to raise that much.");
    return;
  }

  // Deduct chips, update pot and playerBets
  players[humanIdx].chips -= toCall;
  gameState.playerBets[humanIdx] += toCall;
  gameState.pot += toCall;

  // Update currentBet & minimumRaise
  gameState.currentBet = newBet;
  gameState.minimumRaise = raiseAmount;
  gameState.lastRaiser = humanIdx;

  console.log(`You RAISE to ${newBet} (raise size ${raiseAmount})`);

  updateChipsUI();
  updatePotUI();

  setActionButtonsEnabled(false);

  // After a raise, next to act is the player after human
  gameState.currentPlayer = (humanIdx + 1) % players.length;
  promptNextAction();
});

// ─────────────────────────────────────────────────
// 8. Dealing Community Cards (Flop/Turn/River)
// ─────────────────────────────────────────────────
function dealCommunityCards(count) {
  for (let i = 0; i < count; i++) {
    const card = deck.pop();
    communityCards.push(card);

    const slotIdx = communityCards.length - 1; // 0..4
    const slotDiv = commSlots[slotIdx];
    slotDiv.textContent = card.rank + card.suit;

    // Toggle .red if ♥ or ♦
    if (card.suit === "♥" || card.suit === "♦") {
      slotDiv.classList.add("red");
    } else {
      slotDiv.classList.remove("red");
    }
  }
}

/**
 * Advances from one street to the next:
 *  - If currently "preflop", deals the flop and starts a new betting round.
 *  - If currently "flop", deals the turn and starts a new betting round.
 *  - If currently "turn", deals the river and starts a new betting round.
 *  - If currently "river", goes to showdown.
 */
function proceedToNextPhase() {
  switch (gameState.phase) {
    case "preflop":
      gameState.phase = "flop";
      // Deal 3 cards for the flop
      dealCommunityCards(3);
      break;

    case "flop":
      gameState.phase = "turn";
      // Deal 1 card for the turn
      dealCommunityCards(1);
      break;

    case "turn":
      gameState.phase = "river";
      // Deal 1 card for the river
      dealCommunityCards(1);
      break;

    case "river":
      gameState.phase = "showdown";
      // Go straight to showdown—no more betting
      handleShowdown();
      return;
  }

  // If we've not hit showdown yet, set up the next betting round:
  // 1) Clear all playerBets for the new street
  gameState.playerBets = [0, 0, 0, 0, 0];

  // 2) Reset currentBet to 0 (no outstanding wager yet)
  gameState.currentBet = 0;

  // 3) Reset minimumRaise to the big blind (you can adjust as needed)
  gameState.minimumRaise = gameState.bigBlind;

  // 4) Everyone who didn’t fold is still active; dealer starts action
  //    (i.e., the player to left of dealer acts first each new street)
  gameState.lastRaiser = gameState.dealerIndex;
  gameState.currentPlayer = (gameState.dealerIndex + 1) % players.length;

  // 5) Kick off the new betting round
  startBettingRound();
}

// ─────────────────────────────────────────────────
// 9. Showdown Logic
// ─────────────────────────────────────────────────

// Map rank string → numeric value
function getCardValue(card) {
  const rank = card.rank;
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return parseInt(rank, 10);
}

// Given 5 cards, return an object { handType, tiebreakers: [] }
// handType: 8=Straight Flush, 7=Four of a Kind, 6=Full House, 5=Flush,
//           4=Straight, 3=Three of a Kind, 2=Two Pair, 1=One Pair, 0=High Card
function evaluateFiveCardHand(cards) {
  // cards: array of 5 objects {rank, suit}
  const counts = {}; // rank → count
  const suits = {};  // suit → count
  const values = cards.map(getCardValue).sort((a, b) => b - a); // descending

  for (let c of cards) {
    const v = getCardValue(c);
    counts[v] = (counts[v] || 0) + 1;
    suits[c.suit] = (suits[c.suit] || 0) + 1;
  }

  const isFlush = Object.values(suits).some((cnt) => cnt === 5);

  // Check straight (including wheel: A-2-3-4-5)
  let isStraight = false;
  let topStraightValue = null;
  // Create unique sorted array of values for straight detection
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  if (uniqueVals.length >= 5) {
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      const window = uniqueVals.slice(i, i + 5);
      if (window[0] - window[4] === 4) {
        isStraight = true;
        topStraightValue = window[0];
        break;
      }
    }
    // Check wheel: A,5,4,3,2
    if (!isStraight && uniqueVals.includes(14) &&
        uniqueVals.includes(5) &&
        uniqueVals.includes(4) &&
        uniqueVals.includes(3) &&
        uniqueVals.includes(2)) {
      isStraight = true;
      topStraightValue = 5;
    }
  }

  // Count occurrences: extract groups
  const groups = Object.entries(counts) // [ [value, count], ... ]
    .map(([val, cnt]) => ({ val: parseInt(val, 10), cnt }))
    .sort((a, b) => {
      if (b.cnt !== a.cnt) return b.cnt - a.cnt; // compare by count desc
      return b.val - a.val; // then by rank desc
    });

  // Determine hand type and tiebreakers
  if (isStraight && isFlush) {
    return {
      handType: 8,
      tiebreakers: [topStraightValue]
    };
  }
  if (groups[0].cnt === 4) {
    // Four of a kind
    const fourVal = groups[0].val;
    const kicker = groups[1].val;
    return {
      handType: 7,
      tiebreakers: [fourVal, kicker]
    };
  }
  if (groups[0].cnt === 3 && groups[1].cnt === 2) {
    // Full house
    const threeVal = groups[0].val;
    const pairVal = groups[1].val;
    return {
      handType: 6,
      tiebreakers: [threeVal, pairVal]
    };
  }
  if (isFlush) {
    // Flush: compare highest down
    return {
      handType: 5,
      tiebreakers: values
    };
  }
  if (isStraight) {
    return {
      handType: 4,
      tiebreakers: [topStraightValue]
    };
  }
  if (groups[0].cnt === 3) {
    // Three of a kind
    const threeVal = groups[0].val;
    // kickers are next highest two distinct cards
    const kickers = groups
      .filter((g) => g.val !== threeVal)
      .map((g) => g.val)
      .sort((a, b) => b - a)
      .slice(0, 2);
    return {
      handType: 3,
      tiebreakers: [threeVal, ...kickers]
    };
  }
  if (groups[0].cnt === 2 && groups[1].cnt === 2) {
    // Two pair
    const highPair = groups[0].val;
    const lowPair = groups[1].val;
    const kicker = groups
      .filter((g) => g.cnt === 1)
      .map((g) => g.val)
      .sort((a, b) => b - a)[0];
    return {
      handType: 2,
      tiebreakers: [highPair, lowPair, kicker]
    };
  }
  if (groups[0].cnt === 2) {
    // One pair
    const pairVal = groups[0].val;
    const kickers = groups
      .filter((g) => g.val !== pairVal)
      .map((g) => g.val)
      .sort((a, b) => b - a)
      .slice(0, 3);
    return {
      handType: 1,
      tiebreakers: [pairVal, ...kickers]
    };
  }
  // High card
  return {
    handType: 0,
    tiebreakers: values
  };
}

// Compare two hand-score objects. Return:
//   1 if handA > handB, -1 if handA < handB, 0 if equal
function compareHandScores(a, b) {
  if (a.handType > b.handType) return 1;
  if (a.handType < b.handType) return -1;
  // same handType: compare tiebreakers lexicographically
  for (let i = 0; i < a.tiebreakers.length; i++) {
    if (a.tiebreakers[i] > b.tiebreakers[i]) return 1;
    if (a.tiebreakers[i] < b.tiebreakers[i]) return -1;
  }
  return 0;
}

// Given 7 cards (array of 7), return best 5-card hand‐score
function evaluateBestHand(sevenCards) {
  let bestScore = null;
  // Generate combinations of 5 out of 7: total 21 combos
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      // Build a 5-card hand by omitting indices i and j
      const fiveCardHand = [];
      for (let k = 0; k < 7; k++) {
        if (k === i || k === j) continue;
        fiveCardHand.push(sevenCards[k]);
      }
      const score = evaluateFiveCardHand(fiveCardHand);
      if (!bestScore || compareHandScores(score, bestScore) === 1) {
        bestScore = score;
      }
    }
  }
  return bestScore;
}

// Convert handType into human‐readable string
function handTypeToString(handType) {
  switch (handType) {
    case 8: return "Straight Flush";
    case 7: return "Four of a Kind";
    case 6: return "Full House";
    case 5: return "Flush";
    case 4: return "Straight";
    case 3: return "Three of a Kind";
    case 2: return "Two Pair";
    case 1: return "One Pair";
    default: return "High Card";
  }
}

// Reveal CPU hole cards and remove “back” class
function revealCPUHands() {
  for (let i = 1; i < players.length; i++) {
    const cpuId = players[i].id; // e.g., "cpu-1"
    const cpuDiv = document.getElementById(cpuId);
    const cardDivs = cpuDiv.querySelectorAll(".cards .card");
    cardDivs[0].textContent = players[i].hand[0].rank + players[i].hand[0].suit;
    cardDivs[1].textContent = players[i].hand[1].rank + players[i].hand[1].suit;
    if (players[i].hand[0].suit === "♥" || players[i].hand[0].suit === "♦") cardDivs[0].classList.add("red");
    else cardDivs[0].classList.remove("red");
    if (players[i].hand[1].suit === "♥" || players[i].hand[1].suit === "♦") cardDivs[1].classList.add("red");
    else cardDivs[1].classList.remove("red");
    cardDivs[0].classList.remove("back");
    cardDivs[1].classList.remove("back");
  }
}

function hideCPUHands() {
  for (let i = 1; i < players.length; i++) {
    const cpuId = players[i].id; // e.g., "cpu-1"
    const cpuDiv = document.getElementById(cpuId);
    const cardDivs = cpuDiv.querySelectorAll(".cards .card");
    cardDivs[0].textContent = "";
    cardDivs[1].textContent = "";
    cardDivs[0].classList.add("back");
    cardDivs[1].classList.add("back");
  }
}

// Main showdown handler
function handleShowdown() {
  console.log("=== Showdown ===");

  // Reveal all CPU hands
  revealCPUHands();

  // For each active player, combine their hole cards + community cards
  // and evaluate best hand
  const results = []; // { idx, score, playerId }

  for (let i = 0; i < players.length; i++) {
    if (!gameState.activePlayers[i]) continue;
    const allSeven = players[i].hand.concat(communityCards);
    const bestScore = evaluateBestHand(allSeven);
    results.push({ idx: i, score: bestScore, playerId: players[i].id });
  }

  // Compare results to find the winner(s)
  let bestResults = [];
  for (let r of results) {
    if (bestResults.length === 0) {
      bestResults = [r];
    } else {
      const cmp = compareHandScores(r.score, bestResults[0].score);
      if (cmp === 1) {
        bestResults = [r];
      } else if (cmp === 0) {
        bestResults.push(r);
      }
    }
  }

  // Award pot: split evenly among winners
  const splitAmount = Math.floor(gameState.pot / bestResults.length);
  for (let winner of bestResults) {
    players[winner.idx].chips += splitAmount;
  }

  updateChipsUI();

  // Log or alert the outcome
  const description = bestResults
    .map((w) => {
      const ht = handTypeToString(w.score.handType);
      return `${w.playerId.toUpperCase()} (${ht})`;
    })
    .join(", ");

  console.log(`Winner(s): ${description}`);
  alert(`Winner(s): ${description}\nEach wins ${splitAmount} chips.`);
}

// ─────────────────────────────────────────────────
// 10. Hook Up “Deal New Hand” Button
// ─────────────────────────────────────────────────
dealButton.addEventListener("click", () => {
  // Disable “Deal New Hand” while a hand is in progress
  dealButton.disabled = true;

  // Reset raise‐amount input
  raiseInput.value = "";
  setActionButtonsEnabled(false);

  resetTable();

  // Re‐enable the “Deal New Hand” button after showdown (2 seconds after river)
  setTimeout(() => {
    dealButton.disabled = false;
  }, 3000);
});
