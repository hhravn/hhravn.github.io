let audioContext = null;
let wakeLock = null;

export function unlockAudio() {
  if (!('AudioContext' in window)) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(error => console.warn('could not resume audio', error));
  }
}

function tone(frequency, offsetSec, durationSec) {
  const startAt = audioContext.currentTime + offsetSec;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSec + 0.02);
}

export function playCue(kind, muted) {
  if (!muted && audioContext) {
    if (kind === 'tick') tone(880, 0, 0.08);
    if (kind === 'go') tone(1320, 0, 0.35);
    if (kind === 'remove') {
      tone(1320, 0, 0.2);
      tone(990, 0.25, 0.4);
    }
  }
  if (kind !== 'tick' && 'vibrate' in navigator) navigator.vibrate(kind === 'go' ? 200 : [120, 80, 120]);
}

export async function keepAwake() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (error) {
    console.warn('wake lock request rejected', error);
  }
}

export async function releaseAwake() {
  const lock = wakeLock;
  wakeLock = null;
  if (lock) await lock.release();
}
