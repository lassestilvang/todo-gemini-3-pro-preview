type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContextCtor(): typeof AudioContext | undefined {
    if (typeof window === "undefined") return undefined;
    return window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
}

export function playSuccessSound() {
    if (typeof window === 'undefined') return;

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

export function playLevelUpSound() {
    if (typeof window === 'undefined') return;

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();

    // Arpeggio
    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);

        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
}
