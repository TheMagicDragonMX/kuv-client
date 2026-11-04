import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarComponent } from '../../components/avatar.component';
import { SiteHeaderComponent } from '../../components/site-header.component';
import { AuthSession } from '../../services/auth-session.service';
import { MAX_DESCRIPTION, Profile, ProfileChanges, UsersApi } from '../../services/users-api.service';
import { FollowList, FollowSectionComponent } from './follow-section.component';
import { photoFileProblem, photoFromFile } from './profile-photo';

/**
 * The profile of the signed-in user: their photo, name, email and description, which they can
 * change, and below it the sections of the profile. For now the one section is followers and
 * followed. The route only opens for a signed-in user (see `signedInGuard`).
 */
@Component({
	selector: 'app-profile',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ SiteHeaderComponent, AvatarComponent, FollowSectionComponent ],
	templateUrl: './profile.component.html',
})
export class ProfilePage {
	/**
	 * Longest description there can be.
	 */
	protected readonly maxDescription = MAX_DESCRIPTION;

	/**
	 * The profile, or null until it is loaded.
	 */
	protected readonly profile = signal<Profile | null>(null);

	/**
	 * Why the profile could not be loaded, or null.
	 */
	protected readonly loadProblem = signal<string | null>(null);

	/**
	 * True while the description is being written.
	 */
	protected readonly editing = signal(false);

	/**
	 * The description being written.
	 */
	protected readonly draft = signal('');

	/**
	 * True while a change is being saved.
	 */
	protected readonly saving = signal(false);

	/**
	 * Why the last change failed, or null.
	 */
	protected readonly saveProblem = signal<string | null>(null);

	/**
	 * The list shown in the followers section.
	 */
	protected readonly list = signal<FollowList>('following');

	/**
	 * Talks to the API.
	 */
	private readonly usersApi = inject(UsersApi);

	/**
	 * The session, to sign out.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Goes to another page after signing out.
	 */
	private readonly router = inject(Router);

	/**
	 * The followers section, to scroll to it from the counts.
	 */
	private readonly followSection = viewChild<ElementRef<HTMLElement>>('follows');

	/**
	 * Loads the profile of the signed-in user.
	 */
	constructor () {
		this.load();
	}

	/**
	 * Asks the API for the profile.
	 */
	protected load (): void {
		this.loadProblem.set(null);
		this.usersApi.me().subscribe({
			next: (profile) => this.profile.set(profile),
			error: (error: HttpErrorResponse) => this.loadProblem.set(0 === error.status
				? 'No se pudo conectar con el servidor.'
				: 'No se pudo cargar tu perfil.'),
		});
	}

	/**
	 * Starts writing the description, from the one there is.
	 */
	protected edit (): void {
		this.draft.set(this.profile()?.description ?? '');
		this.saveProblem.set(null);
		this.editing.set(true);
	}

	/**
	 * Stops writing the description without saving it.
	 */
	protected cancelEdit (): void {
		this.editing.set(false);
	}

	/**
	 * Saves the description that was written.
	 */
	protected saveDescription (): void {
		this.save({ description: this.draft(), photo: this.profile()?.photo ?? null }, () => this.editing.set(false));
	}

	/**
	 * Turns the picture the user chose into their photo and saves it.
	 */
	protected async changePhoto (event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file)
			return;

		const problem = photoFileProblem(file);

		this.saveProblem.set(problem);

		if (problem)
			return;

		try {
			const photo = await photoFromFile(file);

			this.save({ description: this.profile()?.description ?? null, photo });
		}

		catch {
			this.saveProblem.set('Esa imagen no se pudo abrir. Prueba con otra.');
		}
	}

	/**
	 * Takes the photo off the profile.
	 */
	protected removePhoto (): void {
		this.save({ description: this.profile()?.description ?? null, photo: null });
	}

	/**
	 * Opens one of the lists of the followers section and brings it into view.
	 */
	protected showList (list: FollowList): void {
		this.list.set(list);

		const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

		this.followSection()?.nativeElement.scrollIntoView?.({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
	}

	/**
	 * Loads the profile again after someone was followed or unfollowed, so the counts are right.
	 */
	protected refresh (): void {
		this.usersApi.me().subscribe({ next: (profile) => this.profile.set(profile) });
	}

	/**
	 * Ends the session and goes to the home page.
	 */
	protected signOut (): void {
		this.session.clear();
		void this.router.navigateByUrl('/inicio');
	}

	/**
	 * Sends changes of the profile and shows the profile the API answers with.
	 */
	private save (changes: ProfileChanges, done?: () => void): void {
		this.saving.set(true);
		this.saveProblem.set(null);
		this.usersApi.updateMe(changes).subscribe({
			next: (profile) => {
				this.profile.set(profile);
				this.saving.set(false);
				done?.();
			},
			error: (error: HttpErrorResponse) => {
				this.saveProblem.set(400 === error.status
					? error.error?.message ?? 'Revisa los datos.'
					: 0 === error.status ? 'No se pudo conectar con el servidor.' : 'No se pudo guardar el cambio.');
				this.saving.set(false);
			},
		});
	}
}
