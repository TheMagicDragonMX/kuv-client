import { ChangeDetectionStrategy, Component, ElementRef, computed, model, signal, viewChild } from '@angular/core';
import { CreateCommand } from '../../cube';
import { ObjectEditorComponent } from './object-editor.component';
import { ObjectPreviewComponent } from './object-preview.component';
import { drawingFromObject } from './stage-object';

/**
 * Where the user makes the objects of the program. Each object is a little pixel drawing that
 * starts on the front face; the blocks of the Blocks tab move, hide and recolor them by name.
 * The panel only edits the list (the page keeps it and hands it to the blocks).
 */
@Component({
	selector: 'app-objects-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ ObjectEditorComponent, ObjectPreviewComponent ],
	templateUrl: './objects-panel.component.html',
})
export class ObjectsPanelComponent {
	/**
	 * The objects the program starts with.
	 */
	readonly objects = model<CreateCommand[]>([]);

	/**
	 * Names of the objects hidden from the cube, to see what is behind them. A view setting only.
	 */
	readonly hidden = model<string[]>([]);

	/**
	 * The object being made or edited in the dialog: the original of an edit, or null for a new one.
	 */
	protected readonly session = signal<{ original: CreateCommand | null } | null>(null);

	private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	/**
	 * The names the editor must not repeat: all but the object being edited.
	 */
	protected readonly taken = computed(() => this.objects()
		.map((object) => object.name)
		.filter((name) => name !== this.session()?.original?.name));

	protected create (): void {
		this.open(null);
	}

	protected edit (object: CreateCommand): void {
		this.open(object);
	}

	/**
	 * Whether the pixel editor can show the object (the objects of some examples are too big).
	 */
	protected editable (object: CreateCommand): boolean {
		return null !== drawingFromObject(object);
	}

	protected isHidden (name: string): boolean {
		return this.hidden().includes(name);
	}

	protected toggleHidden (name: string): void {
		this.hidden.update((hidden) => hidden.includes(name) ? hidden.filter((candidate) => candidate !== name) : [ ...hidden, name ]);
	}

	protected remove (name: string): void {
		this.objects.update((objects) => objects.filter((object) => object.name !== name));
		this.hidden.update((hidden) => hidden.filter((candidate) => candidate !== name));
	}

	protected save (object: CreateCommand): void {
		const original = this.session()?.original;

		this.objects.update((objects) => original
			? objects.map((candidate) => candidate.name === original.name ? object : candidate)
			: [ ...objects, object ]);

		if (original && original.name !== object.name)
			this.hidden.update((hidden) => hidden.map((name) => name === original.name ? object.name : name));
		this.dialog().nativeElement.close();
	}

	protected closed (): void {
		this.session.set(null);
	}

	private open (original: CreateCommand | null): void {
		this.session.set({ original });
		this.dialog().nativeElement.showModal();
	}
}
