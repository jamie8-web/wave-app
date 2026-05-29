function speakDJIntro(script, onDone) {
  const utterance = new SpeechSynthesisUtterance(script);
  utterance.rate = 1.1;
  utterance.pitch = 0.9;
  utterance.onend = onDone;
  speechSynthesis.speak(utterance);
}