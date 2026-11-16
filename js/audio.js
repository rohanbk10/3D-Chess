/*************************************************************************
 * 1. PROCEDURAL AUDIO SYNTHESIS (TONE.JS) - STONE SLIDE, LUNGE & SHATTER
 *************************************************************************/
let audioEnabled = true;
let audioInitialized = false;
let stoneSynth, shatterNoise, magicChime, chipLead, chipBass;

async function initAudio() {
  if (audioInitialized || !audioEnabled) return;
  try {
    await Tone.start();
    // Low resonant synth for heavy marble/obsidian stone sliding
    stoneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.35, sustain: 0.02, release: 0.4 }
    }).toDestination();
    stoneSynth.volume.value = -8;

    // Crushing rock shatter burst
    shatterNoise = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.005, decay: 0.45, sustain: 0, release: 0.25 }
    }).toDestination();
    shatterNoise.volume.value = -4;

    // Ethereal cathedral chord chime
    magicChime = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.7, sustain: 0.1, release: 1.2 }
    }).toDestination();
    magicChime.volume.value = -14;

    // 8-bit voices for the victory / defeat jingles
    chipLead = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0.45, release: 0.08 }
    }).toDestination();
    chipLead.volume.value = -16;
    chipBass = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.1 }
    }).toDestination();
    chipBass.volume.value = -10;

    audioInitialized = true;
  } catch (e) {
    console.warn('Audio init skipped:', e);
  }
}

function playSound(type) {
  if (!audioEnabled) return;
  if (!audioInitialized) initAudio();
  if (!audioInitialized) return;
  try {
    const now = Tone.now();
    if (type === 'select') {
      magicChime.triggerAttackRelease(['E5'], 0.12, now);
    } else if (type === 'move') {
      stoneSynth.triggerAttackRelease('C2', '8n', now);
      magicChime.triggerAttackRelease(['A4', 'E5'], 0.18, now + 0.08);
    } else if (type === 'attack') {
      stoneSynth.triggerAttackRelease('G1', '4n', now);
    } else if (type === 'shatter') {
      shatterNoise.triggerAttackRelease('4n', now);
      stoneSynth.triggerAttackRelease('D1', '2n', now + 0.02);
      magicChime.triggerAttackRelease(['D4', 'F4', 'A4', 'D5'], 0.5, now + 0.05);
    } else if (type === 'check') {
      magicChime.triggerAttackRelease(['B4', 'F5', 'B5'], 0.6, now);
    } else if (type === 'victory') {
      playChiptune(VICTORY_JINGLE, now + 0.1);
    } else if (type === 'defeat') {
      playChiptune(DEFEAT_JINGLE, now + 0.1);
    }
  } catch (e) {}
}

// [voice, note, start (s), length (s)]
const VICTORY_JINGLE = [
  ['lead', 'C5', 0.00, 0.10], ['lead', 'E5', 0.12, 0.10], ['lead', 'G5', 0.24, 0.10], ['lead', 'C6', 0.36, 0.20],
  ['lead', 'G5', 0.60, 0.10], ['lead', 'C6', 0.72, 0.20], ['lead', 'E6', 0.96, 0.45],
  ['lead', 'D6', 1.50, 0.10], ['lead', 'E6', 1.62, 0.10], ['lead', 'G6', 1.74, 0.20], ['lead', 'E6', 1.98, 0.10],
  ['lead', 'G6', 2.10, 0.10], ['lead', 'C7', 2.22, 0.80],
  ['bass', 'C3', 0.00, 0.55], ['bass', 'G3', 0.60, 0.30], ['bass', 'C3', 0.96, 0.50], ['bass', 'G2', 1.50, 0.40],
  ['bass', 'C3', 1.98, 0.20], ['bass', 'G2', 2.22, 0.20], ['bass', 'C3', 2.46, 0.60]
];
const DEFEAT_JINGLE = [
  ['lead', 'C5', 0.00, 0.22], ['lead', 'B4', 0.30, 0.22], ['lead', 'A#4', 0.60, 0.22], ['lead', 'A4', 0.90, 0.55],
  ['lead', 'G4', 1.60, 0.20], ['lead', 'F4', 1.85, 0.20], ['lead', 'E4', 2.10, 0.20], ['lead', 'D4', 2.35, 0.90],
  ['bass', 'F2', 0.00, 0.85], ['bass', 'D2', 0.90, 0.65], ['bass', 'C2', 1.60, 1.60]
];

function playChiptune(notes, startTime) {
  notes.forEach(([voice, note, at, len]) => {
    (voice === 'lead' ? chipLead : chipBass).triggerAttackRelease(note, len, startTime + at);
  });
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  setIcon(document.getElementById('icon-sound'), audioEnabled ? 'volume_up' : 'volume_off');
  if (audioEnabled) initAudio();
  saveState();
}

