import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
	computed,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Command, executeCommand } from '../../cube/command';
import { CubeState, Face } from '../../cube/cube-state';
import { VirtualCube } from '../../cube/virtual-cube';
import { COMMAND_SPECS, CommandSpec, buildCommand } from './command-specs';

@Component({
	selector: 'app-simulation',
	standalone: true,
	imports: [ RouterLink ],
	templateUrl: './simulation.component.html',
})
export class SimulationPage implements AfterViewInit, OnDestroy {
	@ViewChild('cubeHost', { static: true }) cubeHost!: ElementRef<HTMLDivElement>;

	/**
	 * Commands offered in the menu.
	 */
	protected readonly specs = COMMAND_SPECS;

	/**
	 * Faces selectable in the face inputs.
	 */
	protected readonly faces = [
		{ value: Face.FRONT, label: 'Front' },
		{ value: Face.RIGHT, label: 'Right' },
		{ value: Face.LEFT, label: 'Left' },
		{ value: Face.BACK, label: 'Back' },
		{ value: Face.TOP, label: 'Top' },
	];

	/**
	 * Command currently being edited in the menu.
	 */
	protected readonly selected = signal<CommandSpec>(COMMAND_SPECS[0]);

	/**
	 * Raw input values of the selected command; missing keys fall back to the field default.
	 */
	protected readonly values = signal<Record<string, string>>({});

	/**
	 * Commands executed so far, oldest first.
	 */
	protected readonly history = signal<Command[]>([]);

	/**
	 * Whether the LED panels are lit; mirrors the state inside the cube.
	 */
	protected readonly panelsEnabled = signal(false);

	/**
	 * History shown newest first.
	 */
	protected readonly recentHistory = computed(() => [ ...this.history() ].reverse());

	private cube?: VirtualCube;

	private state = new CubeState();

	ngAfterViewInit (): void {
		this.cube = new VirtualCube(this.cubeHost.nativeElement, this.state);
	}

	ngOnDestroy (): void {
		this.cube?.dispose();
	}

	protected select (spec: CommandSpec): void {
		this.selected.set(spec);
		this.values.set({});
	}

	protected valueOf (key: string, defaultValue: string): string {
		return this.values()[key] ?? defaultValue;
	}

	protected setValue (key: string, value: string): void {
		this.values.update((values) => ({ ...values, [key]: value }));
	}

	/**
	 * Executes the selected command with the entered values and records it.
	 */
	protected run (): void {
		const command = buildCommand(this.selected(), this.values());
		executeCommand(this.state, command);
		this.history.update((history) => [ ...history, command ]);
	}

	/**
	 * Blanks the cube and forgets the executed commands.
	 */
	protected reset (): void {
		this.state.fill(0);
		this.history.set([]);
	}

	protected togglePanels (): void {
		const enabled = !this.panelsEnabled();
		this.cube?.setPanelsEnabled(enabled);
		this.panelsEnabled.set(enabled);
	}

	protected describe (command: Command): string {
		const { op, ...params } = command as Command & Record<string, unknown>;
		const args = Object.entries(params)
			.map(([ key, value ]) => key === 'color' ? `#${(value as number).toString(16).padStart(6, '0')}` : String(value))
			.join(', ');
		return `${op}(${args})`;
	}
}
