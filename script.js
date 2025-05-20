// === CARD SETUP ===

const suits = ['♠', '♥', '♣', '♦'];
const suitPriority = { '♠': 4, '♥': 3, '♣': 2, '♦': 1 };
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function generateDeck() {
  let deck = [];
  for (let i = 0; i < 2; i++) {
    for (let suit of suits) {
      for (let rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    deck.push({ suit: '', rank: 'JOKER-Small' });
    deck.push({ suit: '', rank: 'JOKER-Big' });
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function deal(deck) {
  let players = {
    player: [],
    cpu1: [],
    cpu2: [],
    cpu3: [],
  };
  for (let i = 0; i < 108; i++) {
    let card = deck[i];
    let who = ['player', 'cpu1', 'cpu2', 'cpu3'][i % 4];
    players[who].push(card);
  }
  return players;
}

function showPlayerHand(hand) {
  const bottom = document.querySelector('.bottom');
  bottom.innerHTML = 'You<br>';

  hand.sort((a, b) => {
    const suitDiff = suitPriority[b.suit] - suitPriority[a.suit];
    if (suitDiff !== 0) return suitDiff;

    // Otherwise, sort by rank (Ace high)
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
  });

  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    const span = document.createElement('span');
    span.className = 'card';
    if (card.suit === '♥' || card.suit === '♦') {
        span.classList.add('red-suit');
    }
    span.textContent = card.rank + card.suit;
    span.dataset.index = i;
    span.onclick = () => toggleSelect(span);
    bottom.appendChild(span);
  }
}

function toggleSelect(cardElement) {
  cardElement.classList.toggle('selected');
}

function getSelectedCards(hand) {
  const selectedIndexes = Array.from(document.querySelectorAll('.card.selected')).map(c => parseInt(c.dataset.index));
  return selectedIndexes.map(i => hand[i]);
}

function validateHand(cards) {
  // Placeholder for now
  return true;
}

function removeSelectedCardsFromHand(hand) {
  const selectedIndexes = Array.from(document.querySelectorAll('.card.selected')).map(c => parseInt(c.dataset.index));
  // Remove from end to avoid index shifting
  selectedIndexes.sort((a, b) => b - a);
  for (let i of selectedIndexes) {
    hand.splice(i, 1);
  }
}

function playTrick(playerCards) {
  const center = document.querySelector('.center');
  center.innerHTML = '';

  // Show player's cards
  const section = document.createElement('div');
  section.innerHTML = `<strong>You:</strong> ` + cardsToString(playerCards);
  center.appendChild(section);

  // CPUs play random cards
  for (let cpu of ['cpu1', 'cpu2', 'cpu3']) {
    const cpuCards = playRandomCards(players[cpu], playerCards.length);
    const section = document.createElement('div');
    section.innerHTML = `<strong>${cpu.toUpperCase()}:</strong> ` + cardsToString(cpuCards);
    center.appendChild(section);
  }
}

function playRandomCards(cpuHand, count) {
  const shuffled = [...cpuHand].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  for (let card of selected) {
    const index = cpuHand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (index !== -1) cpuHand.splice(index, 1);
  }
  return selected;
}

function cardsToString(cards) {
  return cards.map(c => `${c.rank}${c.suit}`).join(' ');
}

// === INIT ===
let deck = shuffle(generateDeck());
let players = deal(deck);
showPlayerHand(players.player);

// === Play button ===
document.getElementById('playBtn').onclick = () => {
  const selected = getSelectedCards(players.player);
  if (selected.length === 0) {
    alert("Select cards to play!");
    return;
  }

  if (!validateHand(selected)) {
    alert("Invalid hand!");
    return;
  }

  removeSelectedCardsFromHand(players.player);
  showPlayerHand(players.player);
  playTrick(selected);
};