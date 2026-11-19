import { Injectable, signal } from '@angular/core';

/**
 * The localStorage key where the choice of sound on or off is remembered.
 */
const STORAGE_KEY = 'kuv-sound';

/**
 * The little 8-bit sounds of the game-like menus: moving between options, a blocked option, a
 * start, a success and a glitch. They are synthesized, so there are no files to load. Browsers only
 * play sound after the user touches the page, so the first ones may stay silent. The user can turn
 * them off; the choice is remembered.
 */
@Injectable({ providedIn: 'root' })
export class MenuSoundService {
	/**
	 * Whether the sounds play, writable only from this service.
	 */
	private readonly state = signal(this.initial());

	/**
	 * Whether the sounds play.
	 */
	readonly enabled = this.state.asReadonly();

	/**
	 * Where the sounds play, made with the first one.
	 */
	private context: AudioContext | null = null;

	/**
	 * Turns the sounds on or off, and remembers it.
	 */
	toggle (): void {
		this.state.update((on) => !on);

		try {
			localStorage.setItem(STORAGE_KEY, this.state() ? 'on' : 'off');
		}

		catch {
			/**
			 * Storage can be blocked; the choice still holds for this visit.
			 */
		}

		this.move();
	}

	/**
	 * The cursor moved to another option.
	 */
	move (): void {
		this.tone(988, 0.045);
		this.tone(1319, 0.06, 'square', 0.03, 0.045);
	}

	/**
	 * The option is blocked or something is missing.
	 */
	deny (): void {
		this.tone(196, 0.08, 'square', 0.045);
		this.tone(147, 0.13, 'square', 0.045, 0.09);
	}

	/**
	 * Something starts, like sending the form.
	 */
	start (): void {
		this.tone(523, 0.07, 'triangle', 0.06);
		this.tone(784, 0.1, 'triangle', 0.06, 0.07);
	}

	/**
	 * Something went right.
	 */
	confirm (): void {
		[ 523, 659, 784, 1047, 1319 ].forEach((frequency, index) => this.tone(frequency, 0.11, 'triangle', 0.06, index * 0.07));
	}

	/**
	 * A burst of broken noise, for the glitch of a wrong password.
	 */
	glitch (): void {
		const context = this.ready();

		if (!context)
			return;

		const length = Math.floor(context.sampleRate * 0.22);
		const buffer = context.createBuffer(1, length, context.sampleRate);
		const data = buffer.getChannelData(0);

		for (let sample = 0; sample < length; sample++)
			data[sample] = (Math.random() * 2 - 1) * (0 === Math.floor(sample / 700) % 2 ? 1 : 0.2) * (1 - sample / length);

		const source = context.createBufferSource();
		const gain = context.createGain();
		gain.gain.value = 0.05;
		source.buffer = buffer;
		source.connect(gain).connect(context.destination);
		source.start();
	}

	/**
	 * Plays one note that fades out.
	 */
	private tone (frequency: number, duration: number, wave: OscillatorType = 'square', volume = 0.035, delay = 0): void {
		const context = this.ready();

		if (!context)
			return;

		const start = context.currentTime + delay;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = wave;
		oscillator.frequency.setValueAtTime(frequency, start);
		gain.gain.setValueAtTime(volume, start);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start(start);
		oscillator.stop(start + duration + 0.02);
	}

	/**
	 * The audio context, made or woken up if needed, or null when the sounds are off or the
	 * browser has none.
	 */
	private ready (): AudioContext | null {
		if (!this.state() || 'undefined' === typeof AudioContext)
			return null;

		try {
			this.context ??= new AudioContext();
		}

		catch {
			return null;
		}

		if ('suspended' === this.context.state)
			this.context.resume().catch(() => undefined);

		return this.context;
	}

	/**
	 * On, unless the user turned the sounds off before.
	 */
	private initial (): boolean {
		try {
			return 'off' !== localStorage.getItem(STORAGE_KEY);
		}

		catch {
			return true;
		}
	}
}
