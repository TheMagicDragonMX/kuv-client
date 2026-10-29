import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SIMULATED_PIN } from '../../setup';
import { SetupPage } from './setup.component';

describe('SetupPage with the simulated cube', () => {
	let fixture: ComponentFixture<SetupPage>;

	/** Lets the simulated cube answer, then renders what changed. */
	async function wait (ms: number): Promise<void> {
		await vi.advanceTimersByTimeAsync(ms);
		fixture.detectChanges();
	}

	function text (): string {
		return fixture.nativeElement.textContent;
	}

	function button (label: string): HTMLButtonElement {
		const found = [ ...fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement> ]
			.find((candidate) => candidate.textContent?.trim().startsWith(label));

		if (!found)
			throw new Error(`No button "${label}"`);

		return found;
	}

	function type (input: HTMLInputElement, value: string): void {
		input.value = value;
		input.dispatchEvent(new Event('input'));
	}

	beforeEach(async () => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({ providers: [ provideRouter([]) ] });
		fixture = TestBed.createComponent(SetupPage);
		fixture.detectChanges();
		await wait(0);
	});

	afterEach(() => {
		fixture.destroy();
		vi.useRealTimers();
	});

	it('says when the browser has no Bluetooth, and still offers the simulated cube', () => {
		expect(text()).toContain('Este navegador no puede usar Bluetooth');
		expect(button('Buscar cubo').disabled).toBe(true);
		expect(button('Probar con un cubo simulado').disabled).toBe(false);
	});

	it('unlocks the cube, lists networks and joins one', async () => {
		button('Probar con un cubo simulado').click();
		await wait(300);

		expect(text()).toContain('Escribe el PIN');

		type(fixture.nativeElement.querySelector('input[formControlName="pin"]'), '0000');
		button('Desbloquear').click();
		await wait(300);

		expect(text()).toContain('PIN incorrecto.');

		type(fixture.nativeElement.querySelector('input[formControlName="pin"]'), SIMULATED_PIN);
		button('Desbloquear').click();
		await wait(1000);

		expect(text()).toContain('Sin conexión');
		expect(text()).toContain('Kuv-Lab');
		expect(text()).toContain('Laboratorio');

		button('Casa').click();
		fixture.detectChanges();
		type(fixture.nativeElement.querySelector('input[formControlName="password"]'), 'long enough');
		button('Conectar').click();
		await wait(3000);

		expect(text()).toContain('El cubo se conectó a Casa.');
		expect(text()).toContain('Conectado · Casa');
		expect(text()).toContain('192.168.1.42');
	});

	it('goes back to the start when the cube reboots', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		button('Probar con un cubo simulado').click();
		await wait(300);
		type(fixture.nativeElement.querySelector('input[formControlName="pin"]'), SIMULATED_PIN);
		button('Desbloquear').click();
		await wait(1000);

		button('Reiniciar').click();
		await wait(1000);

		expect(text()).toContain('El cubo se está reiniciando.');
		expect(text()).not.toContain('Se perdió la conexión');
	});
});
