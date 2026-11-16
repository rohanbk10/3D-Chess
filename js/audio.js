/*************************************************************************
 * 1. PROCEDURAL AUDIO SYNTHESIS (TONE.JS) - STONE SLIDE, LUNGE & SHATTER
 *************************************************************************/
let audioEnabled = true;
let audioInitialized = false;
let stoneSynth, shatterNoise, magicChime;

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
    }
  } catch (e) {}
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  setIcon(document.getElementById('icon-sound'), audioEnabled ? 'volume_up' : 'volume_off');
  if (audioEnabled) initAudio();
  saveState();
}

