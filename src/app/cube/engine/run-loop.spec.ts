import { RunLoop } from './run-loop';

describe('RunLoop', () => {
	beforeEach(() => vi.useFakeTimers());

	afterEach(() => vi.useRealTimers());

	it('calls back at the tick rate with the time of its clock', () => {
		let time = 0;
		const loop = new RunLoop(10, () => time);
		const seen: number[] = [];

		loop.start((now) => seen.push(now));
		time = 100;
		vi.advanceTimersByTime(100);
		time = 200;
		vi.advanceTimersByTime(100);

		expect(seen).toEqual([ 100, 200 ]);
	});

	it('stops calling when stopped', () => {
		const loop = new RunLoop(10, () => 0);
		const onTick = vi.fn();
		loop.start(onTick);

		loop.stop();
		vi.advanceTimersByTime(1000);

		expect(onTick).not.toHaveBeenCalled();
		expect(loop.running).toBe(false);
	});

	it('replaces the callback when started again', () => {
		const loop = new RunLoop(10, () => 0);
		const first = vi.fn();
		const second = vi.fn();

		loop.start(first);
		loop.start(second);
		vi.advanceTimersByTime(100);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});
});
