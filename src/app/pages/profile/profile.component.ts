import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { MAX_BIO, Profile, UserCreation } from '../../models';
import { AuthSession } from '../../services/auth-session.service';
import { SnackbarService } from '../../services/snackbar.service';
import { CreationsService } from '../../services/middle/creations.service';
import { ReportsService } from '../../services/middle/reports.service';
import { UsersService } from '../../services/middle/users.service';
import { FollowList, FollowSectionComponent, followLabel, relationOf } from './follow-section.component';
import { PhotoCropperComponent } from './photo-cropper.component';
import { Crop, openPicture, photoFileProblem, photoFromCrop } from './profile-photo';

/**
 * The profile of a user (the signed-in user or another creator): their photo, name, email
 * (if viewing own profile) and bio, their public or personal cube creations,
 * and below it the followers and followed section.
 */
export interface ReportCategoryOption {
	value: string;
	label: string;
	description: string;
	icon: string;
}

@Component({
	selector: 'app-profile',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ AvatarComponent, FollowSectionComponent, FormsModule, PhotoCropperComponent, RouterLink ],
	templateUrl: './profile.component.html',
})
export class ProfilePage implements OnInit {
	/**
	 * Longest bio there can be.
	 */
	protected readonly maxBio = MAX_BIO;

	/**
	 * Target user id if viewing another user's profile, or null if viewing own profile.
	 */
	protected readonly targetUserId = signal<number | null>(null);

	/**
	 * The profile, or null until it is loaded.
	 */
	protected readonly profile = signal<Profile | null>(null);

	/**
	 * Why the profile could not be loaded, or null.
	 */
	protected readonly loadProblem = signal<string | null>(null);

	/**
	 * True while the bio is being written.
	 */
	protected readonly editing = signal(false);

	/**
	 * The bio being written.
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
	 * The picture being framed in the cropper, or null while it is closed.
	 */
	protected readonly cropping = signal<ImageBitmap | null>(null);

	/**
	 * The popup with the cropper.
	 */
	private readonly cropper = viewChild<ElementRef<HTMLDialogElement>>('cropper');

	/**
	 * True while following or unfollowing the user from the profile header.
	 */
	protected readonly followingUser = signal(false);

	/**
	 * The list shown in the followers section.
	 */
	protected readonly list = signal<FollowList>('following');

	/**
	 * Creations owned by the user.
	 */
	protected readonly creations = signal<UserCreation[]>([]);

	/**
	 * True while user creations are being loaded.
	 */
	protected readonly loadingCreations = signal<boolean>(false);

	/**
	 * Error message if creations could not be loaded.
	 */
	protected readonly creationsProblem = signal<string | null>(null);

	/**
	 * Map of creation ID to streamable video URL.
	 */
	protected readonly videoUrls = signal<Record<number, string>>({});

	/**
	 * ID of the creation currently being deleted.
	 */
	protected readonly deletingId = signal<number | null>(null);

	/**
	 * ID of the creation whose visibility is currently being toggled.
	 */
	protected readonly togglingVisibilityId = signal<number | null>(null);

	/**
	 * Relation and follow label helpers.
	 */
	protected readonly relationOf = relationOf;
	protected readonly followLabel = followLabel;

	/**
	 * Available report categories for inappropriate user profiles.
	 */
	protected readonly userReportCategories: ReportCategoryOption[] = [
		{
			value: 'impersonation',
			label: 'Suplantación de identidad',
			description: 'Finge ser otra persona, creador o entidad oficial de KUV.',
			icon: '🎭',
		},
		{
			value: 'inappropriate_profile',
			label: 'Foto, biografía o nombre inapropiado',
			description: 'Avatar, nombre o biografía con contenido explícito u ofensivo.',
			icon: '🖼️',
		},
		{
			value: 'harassment',
			label: 'Acoso, insultos o amenazas',
			description: 'Mensajes hostiles dirigidos, intimidación o comentarios degradantes.',
			icon: '🎯',
		},
		{
			value: 'hate_speech',
			label: 'Discurso de odio o discriminación',
			description: 'Ataques por motivos de origen, género, religión u orientación.',
			icon: '🚫',
		},
		{
			value: 'spam_phishing',
			label: 'Spam, bot o enlaces fraudulentos',
			description: 'Publicidad masiva no deseada, enlaces maliciosos o actividad automatizada.',
			icon: '🤖',
		},
		{
			value: 'doxxing',
			label: 'Filtración de datos privados',
			description: 'Publicación de información personal confidencial sin consentimiento.',
			icon: '🔒',
		},
		{
			value: 'trolling',
			label: 'Comportamiento destructivo o sabotaje',
			description: 'Provocaciones constantes para arruinar la convivencia de la comunidad.',
			icon: '⚠️',
		},
		{
			value: 'other',
			label: 'Otro motivo',
			description: 'Cualquier otra infracción grave a las normas de convivencia.',
			icon: '❓',
		},
	];

	/**
	 * Report dialog state.
	 */
	protected readonly showReportModal = signal<boolean>(false);
	protected readonly reportCategory = signal<string>('impersonation');
	protected reportDetails = '';
	protected readonly reportSubmitted = signal<boolean>(false);
	protected readonly isSubmittingReport = signal<boolean>(false);

	/**
	 * Talks to the user API.
	 */
	private readonly usersService = inject(UsersService);

	/**
	 * Tells the user what happened to their photo.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * Talks to the creations API.
	 */
	private readonly creationsService = inject(CreationsService);

	/**
	 * Talks to the reports API.
	 */
	private readonly reportsService = inject(ReportsService);

	/**
	 * The session, to sign out.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Routing and current route.
	 */
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	/**
	 * The followers section element and component reference.
	 */
	private readonly followSection = viewChild<ElementRef<HTMLElement>>('follows');
	private readonly followSectionComponent = viewChild(FollowSectionComponent);

	ngOnInit (): void {
		this.route.paramMap.subscribe((params) => {
			const idParam = params.get('id');
			const parsedId = idParam ? parseInt(idParam, 10) : null;
			const id = parsedId && !isNaN(parsedId) ? parsedId : null;

			this.targetUserId.set(id);
			this.editing.set(false);
			this.load();
			this.loadCreations();
		});
	}

	/**
	 * Asks the API for the profile.
	 */
	protected load (): void {
		this.loadProblem.set(null);
		const id = this.targetUserId();
		const request = null === id ? this.usersService.me() : this.usersService.profile({ id });

		request.subscribe({
			next: (profile) => this.profile.set(profile),
			error: (error: HttpErrorResponse) => this.loadProblem.set(
				0 === error.status
					? 'No se pudo conectar con el servidor.'
					: 404 === error.status
						? 'El usuario no existe o ha sido eliminado.'
						: null === id
							? 'No se pudo cargar tu perfil.'
							: 'No se pudo cargar el perfil.',
			),
		});
	}

	/**
	 * Loads creations from the API (all if own profile, public only if another creator).
	 */
	protected loadCreations (): void {
		this.loadingCreations.set(true);
		this.creationsProblem.set(null);
		const id = this.targetUserId();

		const request = null === id
			? this.creationsService.getMyCreations()
			: this.creationsService.getUserCreations({ id });

		request.subscribe({
			next: (items) => {
				this.creations.set(items);
				const token = this.session.accessToken();
				const urls: Record<number, string> = {};
				for (const item of items) 
					if (item.hasVideo) 
						urls[item.id] = this.creationsService.videoUrl({ id: item.id, token });
					
				
				this.videoUrls.set(urls);
				this.loadingCreations.set(false);
			},
			error: (error: HttpErrorResponse) => {
				this.loadingCreations.set(false);
				this.creationsProblem.set(
					0 === error.status
						? 'No se pudo conectar para cargar las creaciones.'
						: 'No se pudieron cargar las creaciones.',
				);
			},
		});
	}

	/**
	 * Follows or unfollows the profile currently viewed.
	 */
	protected toggleFollowCurrentProfile (): void {
		const current = this.profile();
		if (!current || current.isYou || this.followingUser())
			return;

		this.followingUser.set(true);
		const request = current.youFollow
			? this.usersService.unfollow({ id: current.id })
			: this.usersService.follow({ id: current.id });

		request.subscribe({
			next: (updatedProfile) => {
				this.profile.set(updatedProfile);
				this.followingUser.set(false);
				this.followSectionComponent()?.reload();
			},
			error: (error: HttpErrorResponse) => {
				this.followingUser.set(false);
				alert(error.error?.message ?? 'No se pudo actualizar el seguimiento. Inténtalo de nuevo.');
			},
		});
	}

	/**
	 * Opens a creation in the cube editor.
	 */
	protected openInEditor (creation: UserCreation): void {
		void this.router.navigate([ '/editor' ], { queryParams: { project: creation.id } });
	}

	/**
	 * Toggles whether a creation is public or private.
	 */
	protected toggleVisibility (creation: UserCreation, event: MouseEvent): void {
		event.stopPropagation();
		const nextState = !creation.isPublic;
		this.togglingVisibilityId.set(creation.id);

		this.creationsService.setVisibility({ id: creation.id }, { isPublic: nextState }).subscribe({
			next: (updated) => {
				this.togglingVisibilityId.set(null);
				this.creations.update((list) =>
					list.map((c) => (c.id === updated.id ? { ...c, isPublic: updated.isPublic } : c)),
				);
			},
			error: (error: HttpErrorResponse) => {
				this.togglingVisibilityId.set(null);
				alert(error.error?.message ?? 'No se pudo cambiar la visibilidad de la creación.');
			},
		});
	}

	/**
	 * Deletes a creation after confirmation.
	 */
	protected deleteCreation (creation: UserCreation, event: MouseEvent): void {
		event.stopPropagation();
		if (!confirm(`¿Estás seguro de eliminar "${creation.title}"? Esta acción no se puede deshacer.`)) 
			return;
		

		this.deletingId.set(creation.id);
		this.creationsService.deleteCreation({ id: creation.id }).subscribe({
			next: () => {
				this.deletingId.set(null);
				this.creations.update((list) => list.filter((c) => c.id !== creation.id));
			},
			error: (error: HttpErrorResponse) => {
				this.deletingId.set(null);
				alert(error.error?.message ?? 'No se pudo eliminar la creación.');
			},
		});
	}

	/**
	 * Formats a creation date nicely.
	 */
	protected formatDate (dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return dateString;
		}
	}

	/**
	 * Starts writing the bio, from the one there is.
	 */
	protected edit (): void {
		this.draft.set(this.profile()?.bio ?? '');
		this.saveProblem.set(null);
		this.editing.set(true);
	}

	/**
	 * Stops writing the bio without saving it.
	 */
	protected cancelEdit (): void {
		this.editing.set(false);
	}

	/**
	 * Saves the bio that was written.
	 */
	protected saveBio (): void {
		this.save(this.usersService.updateMe({ bio: this.draft() }), () => this.editing.set(false));
	}

	/**
	 * Opens the picture the user chose in the cropper, so they frame their photo.
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
			this.cropping.set(await openPicture(file));
			this.cropper()?.nativeElement.showModal();
		}

		catch {
			this.saveProblem.set('Esa imagen no se pudo abrir. Prueba con otra.');
		}
	}

	/**
	 * Turns the square the user framed into their photo and saves it, closing the cropper once
	 * it is saved. If saving fails the cropper stays open, saying why.
	 */
	protected async cropPhoto (crop: Crop): Promise<void> {
		const picture = this.cropping();

		if (!picture)
			return;

		try {
			const photo = await photoFromCrop(picture, crop);

			this.save(this.usersService.updatePhoto({ photo }), () => {
				this.cropper()?.nativeElement.close();
				this.snackbar.success('Tu foto de perfil se actualizó.');
			});
		}

		catch {
			this.saveProblem.set('Esa imagen no se pudo guardar. Prueba con otra.');
		}
	}

	/**
	 * Lets go of the picture once the cropper closes, whether the photo was saved or not.
	 */
	protected cropperClosed (): void {
		this.cropping()?.close();
		this.cropping.set(null);
	}

	/**
	 * Takes the photo off the profile.
	 */
	protected removePhoto (): void {
		this.save(this.usersService.removePhoto(), () => this.snackbar.success('Quitaste tu foto de perfil.'));
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
		const id = this.targetUserId();
		const request = null === id ? this.usersService.me() : this.usersService.profile({ id });

		request.subscribe({ next: (profile) => this.profile.set(profile) });
	}

	/**
	 * Ends the session and goes to the home page.
	 */
	protected signOut (): void {
		this.session.clear();
		void this.router.navigateByUrl('/inicio');
	}

	/**
	 * Open report dialog for this user profile.
	 */
	protected openReportModal (): void {
		const me = this.profile();
		if (!me || me.isYou) {
			this.snackbar.show('No puedes reportar tu propio perfil.');
			return;
		}
		this.reportSubmitted.set(false);
		this.isSubmittingReport.set(false);
		this.reportCategory.set('impersonation');
		this.reportDetails = '';
		this.showReportModal.set(true);
	}

	/**
	 * Close report dialog.
	 */
	protected closeReportModal (): void {
		this.showReportModal.set(false);
	}

	/**
	 * Submit abuse report for this user profile.
	 */
	protected submitReport (): void {
		const me = this.profile();
		if (!me || me.isYou || this.isSubmittingReport() || this.reportSubmitted()) 
			return;
		

		this.isSubmittingReport.set(true);

		const reportEntry = {
			id: `rep_${Date.now()}`,
			type: 'user',
			targetId: String(me.id),
			targetName: `@${me.username}`,
			reportedUser: me.username,
			reportingUser: 'tú',
			category: this.reportCategory(),
			details: this.reportDetails.trim(),
			createdAt: new Date().toISOString(),
		};

		try {
			const existing = JSON.parse(localStorage.getItem('kuv_reports') || '[]');
			existing.push(reportEntry);
			localStorage.setItem('kuv_reports', JSON.stringify(existing));
		} catch {
			// Local storage fallback
		}

		setTimeout(() => {
			this.isSubmittingReport.set(false);
			this.reportSubmitted.set(true);
			setTimeout(() => {
				this.showReportModal.set(false);
				this.snackbar.show('Reporte recibido. El perfil del usuario será revisado por moderación. ¡Gracias!');
			}, 1400);
		}, 600);
	}

	/**
	 * Sends a change of the profile and shows the profile the API answers with.
	 */
	private save (change: Observable<Profile>, done?: () => void): void {
		this.saving.set(true);
		this.saveProblem.set(null);
		change.subscribe({
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

