// === CARD SETUP ===

const suits = ['♠', '♥', '♣', '♦'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const jokers = ['🃏 Small', '🃏 Big'];

// Generate one standard deck
function generateDeck() {
  let deck = [];
  for (let i = 0; i < 2; i++) { // Two decks
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

// Shuffle using Fisher-Yates
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Deal 27 cards to each player
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

// Display player's hand at the bottom
function showPlayerHand(hand) {
  const bottom = document.querySelector('.bottom');
  bottom.innerHTML = 'You<br>';

  hand.sort((a, b) => {
    const rankOrder = [...ranks, 'JOKER-Small', 'JOKER-Big'];
    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
  });

  for (let card of hand) {
    const span = document.createElement('span');
    span.className = 'card';
    span.textContent = card.rank + card.suit;
    bottom.appendChild(span);
  }
}

// === INIT ===
let deck = generateDeck();
shuffle(deck);
let players = deal(deck);
showPlayerHand(players.player);

// For now, just log CPU hands
console.log("CPU1:", players.cpu1);
console.log("CPU2:", players.cpu2);
console.log("CPU3:", players.cpu3);