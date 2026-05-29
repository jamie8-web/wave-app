const templates = [
  (song, artist) => `Up next, ${song} by ${artist}. Let's go!`,
  (song, artist) => `Here's a track you'll love — ${song} from ${artist}.`,
  (song, artist) => `${artist} coming at you with ${song}. Enjoy!`,
  (song, artist) => `You've been loving this. Here's ${song}.`,
  (song, artist) => `Fresh track: ${song} by ${artist}.`,
  (song, artist) => `Can't miss this one — ${song} by ${artist}!`,
  (song, artist) => `Keeping it going with ${song} from ${artist}.`,
  (song, artist) => `Next up on your wave — ${song} by ${artist}!`
];

function generateDJIntro(songTitle, artistName) {
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex](songTitle, artistName);
}

module.exports = { generateDJIntro };