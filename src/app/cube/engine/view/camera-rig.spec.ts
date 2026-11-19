import { vi } from 'vitest';
import { CameraRig } from './camera-rig';

describe('CameraRig', () => {
	it('takes its keyboard listener off the document even when the canvas already left the page', () => {
		const canvas = document.createElement('canvas');
		document.body.appendChild(canvas);

		const added = vi.spyOn(document, 'addEventListener');
		const rig = new CameraRig(canvas);
		const listener = added.mock.calls.find(([ type ]) => 'keydown' === type)?.[1];
		const removed = vi.spyOn(document, 'removeEventListener');

		/**
		 * Angular takes the canvas off the page before the view is destroyed.
		 */
		canvas.remove();
		rig.dispose();

		expect(listener).toBeDefined();
		expect(removed.mock.calls.some(([ type, handler ]) => 'keydown' === type && listener === handler)).toBe(true);

		added.mockRestore();
		removed.mockRestore();
	});
});
