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

	protected remove (name: string): void {
		this.objects.update((objects) => objects.filter((object) => object.name !== name));
	}

	protected save (object: CreateCommand): void {
		const original = this.session()?.original;

		this.objects.update((objects) => original
			? objects.map((candidate) => candidate.name === original.name ? object : candidate)
			: [ ...objects, object ]);
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
