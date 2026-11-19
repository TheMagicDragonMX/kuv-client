import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	ViewChild,
	computed,
	inject,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import {
	CubeComponent,
	EXAMPLE_PROGRAMS,
	ExampleProgram,
	Face,
	Program,
} from '../../cube';
import { CommentItem, CommentsService } from '../../services/comments.service';
import { CurrentUser } from '../../services/current-user.service';
import { CreationsService } from '../../services/middle/creations.service';
import { FeedService } from '../../services/middle/feed.service';
import { UsersService } from '../../services/middle/users.service';
import { ReportsService } from '../../services/middle/reports.service';
import { SnackbarService } from '../../services/snackbar.service';

export interface CatalogAnimationItem {
	id: string;
	title: string;
	author: string;
	authorId?: number;
	authorUsername: string;
	authorPhoto: string | null;
	likes: number;
	category: string;
	tags: string[];
	exampleProgram?: ExampleProgram;
}

export interface ReportCategoryOption {
	value: string;
	label: string;
	description: string;
	icon: string;
}

export interface ReportTarget {
	type: 'animation' | 'user' | 'comment';
	targetId: string;
	numericTargetId?: number;
	targetName: string;
	commentSnippet?: string;
	reportedUsername: string;
}

export interface AnimationDetailData {
	id: string;
	numericId?: number;
	title: string;
	description: string;
	author: string;
	authorId?: number;
	authorUsername: string;
	authorPhoto: string | null;
	authorBio?: string;
	authorFollowers: number;
	isFollowing: boolean;
	createdAt: string;
	views: number;
	likes: number;
	liked: boolean;
	saved: boolean;
	category: string;
	tags: string[];
	program: Program;
}

@Component({
	selector: 'app-animation-detail',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		AvatarComponent,
		CubeComponent,
	],
	templateUrl: './animation-detail.component.html',
})
export class AnimationDetailPage implements OnInit {
	@ViewChild('cube', { static: false })
	protected cubeRef?: CubeComponent;

	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly snackbar = inject(SnackbarService);
	private readonly commentsService = inject(CommentsService);
	private readonly creationsService = inject(CreationsService);
	private readonly usersService = inject(UsersService);
	private readonly feedService = inject(FeedService);
	private readonly reportsService = inject(ReportsService);
	protected readonly currentUser = inject(CurrentUser);

	/**
	 * Mobile toggle for collapsing/expanding the side panel.
	 */
	protected readonly sidePanelOpen = signal<boolean>(true);

	/**
	 * Faces available for camera alignment.
	 */
	protected readonly faces: { label: string; value: Face }[] = [
		{ label: 'Frente', value: Face.FRONT },
		{ label: 'Atrás', value: Face.BACK },
		{ label: 'Izq', value: Face.LEFT },
		{ label: 'Der', value: Face.RIGHT },
		{ label: 'Arriba', value: Face.TOP },
	];

	/**
	 * Library of community catalog animations (examples + feed) used for similarity matching.
	 */
	protected readonly catalog = signal<CatalogAnimationItem[]>([
		{
			id: 'around',
			title: 'Órbita Perimetral',
			author: 'Sofia Medina',
			authorUsername: 'sofia_creative',
			authorPhoto: null,
			likes: 428,
			category: 'Patrones',
			tags: [ '#PixelArt', '#Cube3D', '#LEDMatrix', '#Ondas', '#RGB' ],
			exampleProgram: EXAMPLE_PROGRAMS[0],
		},
		{
			id: 'smooth-belt',
			title: 'Anillo de Luz Infinito',
			author: 'Sofia Medina',
			authorUsername: 'sofia_creative',
			authorPhoto: null,
			likes: 312,
			category: 'Bucles',
			tags: [ '#LEDMatrix', '#RGB', '#Bucles', '#Ondas' ],
			exampleProgram: EXAMPLE_PROGRAMS[5],
		},
		{
			id: 'plus',
			title: 'Cruz Holográfica',
			author: 'Sofia Medina',
			authorUsername: 'sofia_creative',
			authorPhoto: null,
			likes: 178,
			category: 'Geometría',
			tags: [ '#PixelArt', '#Geometría', '#Cube3D' ],
			exampleProgram: EXAMPLE_PROGRAMS[8],
		},
		{
			id: 'wave-wall',
			title: 'Muro Ondulante',
			author: 'Lucía Valdés',
			authorUsername: 'lucia_v',
			authorPhoto: null,
			likes: 245,
			category: 'Patrones',
			tags: [ '#Ondas', '#LEDMatrix', '#PixelArt', '#RGB' ],
			exampleProgram: EXAMPLE_PROGRAMS[7],
		},
		{
			id: 'rain',
			title: 'Lluvia Digital Matrix',
			author: 'NeoPixel',
			authorUsername: 'neo_pixel',
			authorPhoto: null,
			likes: 540,
			category: 'Efectos',
			tags: [ '#Matrix', '#Efectos', '#LEDMatrix', '#Verde' ],
			exampleProgram: EXAMPLE_PROGRAMS[2],
		},
		{
			id: 'raindrops',
			title: 'Gotas de Agua',
			author: 'NeoPixel',
			authorUsername: 'neo_pixel',
			authorPhoto: null,
			likes: 389,
			category: 'Efectos',
			tags: [ '#Efectos', '#Cube3D', '#Ondas' ],
			exampleProgram: EXAMPLE_PROGRAMS[3],
		},
		{
			id: 'blink',
			title: 'Pulso Galáctico',
			author: 'KuvMaster',
			authorUsername: 'kuv_master',
			authorPhoto: null,
			likes: 310,
			category: 'Ritmo',
			tags: [ '#RGB', '#Ritmo', '#PixelArt', '#Ondas' ],
			exampleProgram: EXAMPLE_PROGRAMS[9],
		},
		{
			id: 'over-the-top',
			title: 'Cúspide de Neón',
			author: 'Alex Torres',
			authorUsername: 'alex_t',
			authorPhoto: null,
			likes: 215,
			category: 'Geometría',
			tags: [ '#Cube3D', '#Geometría', '#RGB' ],
			exampleProgram: EXAMPLE_PROGRAMS[1],
		},
	]);

	/**
	 * Current animation details.
	 */
	protected readonly animation = signal<AnimationDetailData>({
		id: 'around',
		title: 'Órbita Perimetral',
		description:
			'Una simulación volumétrica fluida que genera ondas electromagnéticas a través de las caras del cubo LED. Diseñada con gradientes de color cyan, violeta y rosa brillante, aprovechando la persistencia retiniana.',
		author: 'Sofia Medina',
		authorUsername: 'sofia_creative',
		authorPhoto: null,
		authorBio: 'Diseñadora interactiva y entusiasta de instalaciones lumínicas KUV.',
		authorFollowers: 1420,
		isFollowing: false,
		createdAt: '15 de Noviembre, 2026',
		views: 3840,
		likes: 428,
		liked: false,
		saved: false,
		category: 'Patrones',
		tags: [ '#PixelArt', '#Cube3D', '#LEDMatrix', '#Ondas', '#RGB' ],
		program: EXAMPLE_PROGRAMS[0].program,
	});

	/**
	 * List of comments on this animation loaded from CommentsService.
	 */
	protected readonly comments = signal<CommentItem[]>([]);

	/**
	 * How many comments are shown before expanding.
	 */
	protected readonly commentsInitialLimit = 2;
	protected readonly showAllComments = signal<boolean>(false);

	/**
	 * Computed slice of comments to display.
	 */
	protected readonly visibleComments = computed(() => {
		const all = this.comments();
		if (this.showAllComments()) 
			return all;
		
		return all.slice(0, this.commentsInitialLimit);
	});

	/**
	 * Computed "Más de este creador":
	 * Filter animations in the catalog by the same author, excluding the current one.
	 */
	protected readonly creatorAnimations = computed(() => {
		const current = this.animation();
		return this.catalog().filter(
			(item) =>
				item.id !== current.id &&
				(item.authorUsername.toLowerCase() === current.authorUsername.toLowerCase() ||
					(current.authorId !== undefined && item.authorId === current.authorId))
		);
	});

	/**
	 * Computed "Animaciones similares":
	 * Algorithm based on:
	 * 1. Count of shared tags (+2 points per shared tag)
	 * 2. Shared category (+1 point)
	 * 3. Excluding current animation and creator's own animations
	 */
	protected readonly similarAnimations = computed(() => {
		const current = this.animation();
		const creatorIds = new Set(this.creatorAnimations().map((c) => c.id));
		creatorIds.add(current.id);

		const currentTagsLower = current.tags.map((t) => t.toLowerCase());

		const scored = this.catalog()
			.filter((item) => !creatorIds.has(item.id))
			.map((item) => {
				let score = 0;
				// Tag similarity
				for (const tag of item.tags) 
					if (currentTagsLower.includes(tag.toLowerCase())) 
						score += 2;
					
				
				// Category similarity
				if (item.category.toLowerCase() === current.category.toLowerCase()) 
					score += 1;
				
				return { item, score };
			});

		// Sort by relevance score descending, then by likes
		scored.sort((a, b) => b.score - a.score || b.item.likes - a.item.likes);

		return scored.map((s) => s.item).slice(0, 4);
	});

	/**
	 * Available report categories for inappropriate or harmful content.
	 */
	protected readonly reportCategories: ReportCategoryOption[] = [
		{
			value: 'obscene',
			label: 'Contenido obsceno o explícito',
			description: 'Dibujos, formas o textos con temática para adultos o no aptos.',
			icon: '🔞',
		},
		{
			value: 'offensive_language',
			label: 'Lenguaje ofensivo o incitación al odio',
			description: 'Insultos, discriminación o palabras altisonantes en título o animación.',
			icon: '🤬',
		},
		{
			value: 'harassment',
			label: 'Acoso o intimidación',
			description: 'Ataques directos, burlas dirigidas a un usuario o difamación.',
			icon: '🎯',
		},
		{
			value: 'photosensitivity_risk',
			label: 'Riesgo visual (fotosensibilidad / epilepsia)',
			description: 'Parpadeos extremos o patrones estroboscópicos sin advertencia previa.',
			icon: '⚡',
		},
		{
			value: 'spam',
			label: 'Spam o publicidad no deseada',
			description: 'Promociones comerciales, enlaces externos o repetición masiva.',
			icon: '📢',
		},
		{
			value: 'plagiarism',
			label: 'Plagio o copia no autorizada',
			description: 'Copia idéntica de la obra de otro creador sin atribución.',
			icon: '©️',
		},
		{
			value: 'other',
			label: 'Otro motivo',
			description: 'Cualquier otra razón que requiera revisión del equipo.',
			icon: '❓',
		},
	];

	/**
	 * Available report categories for inappropriate user profiles or abusive comments.
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
	 * Text of the new comment being drafted.
	 */
	protected newComment = '';

	/**
	 * Active reply comment id if replying to a specific comment.
	 */
	protected replyingToId = signal<string | null>(null);
	protected replyText = '';

	/**
	 * Report modal state and target.
	 */
	protected showReportModal = signal<boolean>(false);
	protected reportTarget = signal<ReportTarget | null>(null);
	protected reportCategory = signal<string>('obscene');
	protected reportDetails = '';
	protected reportSubmitted = signal<boolean>(false);
	protected isSubmittingReport = signal<boolean>(false);

	/**
	 * Active category list depending on report target.
	 */
	protected readonly activeReportCategories = computed(() => {
		const target = this.reportTarget();
		return 'animation' === target?.type ? this.reportCategories : this.userReportCategories;
	});

	/**
	 * Get the current user display name.
	 */
	protected currentUsername (): string {
		return this.currentUser.profile()?.username ?? 'Tú';
	}

	/**
	 * Check if a username corresponds to the current logged-in user.
	 * Used to enforce that users cannot self-report their content or account.
	 */
	protected isSelf (username?: string | null): boolean {
		if (!username) 
			return false;
		
		const current = this.currentUsername();
		const target = username.trim().toLowerCase();
		return target === current.trim().toLowerCase() || 'tú' === target;
	}

	ngOnInit (): void {
		this.route.paramMap.subscribe((params) => {
			const id = params.get('id');
			if (id) 
				this.loadAnimation(id);
			 else 
				this.loadAnimation('around');
			
		});

		// Enrich catalog with public feed creations from API if available
		this.feedService.newCreations({ limit: 12 }).subscribe({
			next: (creations) => {
				const apiItems: CatalogAnimationItem[] = creations.map((c) => ({
					id: String(c.id),
					title: c.title,
					author: c.authorUsername,
					authorId: c.authorId,
					authorUsername: c.authorUsername,
					authorPhoto: c.authorPhoto,
					likes: 0,
					category: 'Comunidad',
					tags: [ '#Comunidad', '#Kuv', '#PixelArt' ],
				}));

				this.catalog.update((curr) => {
					const existingIds = new Set(curr.map((i) => i.id));
					const fresh = apiItems.filter((i) => !existingIds.has(i.id));
					return [ ...curr, ...fresh ];
				});
			},
			error: () => {
				// Standalone mode / offline, catalog has fallback items
			},
		});
	}

	/**
	 * Load animation from API if numeric ID, or from catalog/examples if string key.
	 */
	protected loadAnimation (id: string): void {
		const isNumeric = /^\d+$/.test(id);

		if (isNumeric) {
			const numericId = parseInt(id, 10);
			this.creationsService.getCreation({ id: numericId }).subscribe({
				next: (detail) => {
					try {
						const parsed = this.creationsService.parseCreation(detail);
						this.animation.set({
							id: String(detail.id),
							numericId: detail.id,
							title: detail.title,
							description: detail.description || 'Animación creada con bloques en KUV.',
							author: `Usuario #${detail.userId}`,
							authorId: detail.userId,
							authorUsername: `user_${detail.userId}`,
							authorPhoto: null,
							authorFollowers: 0,
							isFollowing: false,
							createdAt: detail.createdAt.slice(0, 10),
							views: 1,
							likes: 0,
							liked: false,
							saved: false,
							category: 'Comunidad',
							tags: [ '#Comunidad', '#LEDMatrix', '#Cube3D' ],
							program: parsed.program,
						});

						if (this.cubeRef) 
							this.cubeRef.run(parsed.program);
						

						// Fetch owner user profile to show real author name and avatar
						this.usersService.profile({ id: detail.userId }).subscribe({
							next: (profile) => {
								this.animation.update((curr) => ({
									...curr,
									author: profile.username,
									authorUsername: profile.username,
									authorPhoto: profile.photo,
									authorBio: profile.bio ?? undefined,
									authorFollowers: profile.followers,
									isFollowing: profile.youFollow,
								}));
							},
						});
					} catch {
						this.snackbar.show('El formato del programa de la animación no es compatible.');
					}

					this.refreshComments(id, this.animation().authorUsername);
				},
				error: () => {
					// Fallback to example if not found on server
					this.loadFromCatalog(id);
				},
			});
		} else 
			this.loadFromCatalog(id);
		
	}

	private loadFromCatalog (id: string): void {
		const found = this.catalog().find((item) => item.id.toLowerCase() === id.toLowerCase());
		if (found && found.exampleProgram) {
			this.animation.set({
				id: found.id,
				title: found.title,
				description: found.exampleProgram.description,
				author: found.author,
				authorId: found.authorId,
				authorUsername: found.authorUsername,
				authorPhoto: found.authorPhoto,
				authorFollowers: 1420,
				isFollowing: false,
				createdAt: 'Reciente',
				views: 1250,
				likes: found.likes,
				liked: false,
				saved: false,
				category: found.category,
				tags: found.tags,
				program: found.exampleProgram.program,
			});

			if (this.cubeRef) 
				this.cubeRef.run(found.exampleProgram.program);
			
		}

		this.refreshComments(id, this.animation().authorUsername);
	}

	/**
	 * Select an animation from suggestions and navigate/update.
	 */
	protected selectSuggested (item: CatalogAnimationItem): void {
		this.router.navigate([ '/animation', item.id ]);
	}

	/**
	 * Refresh comments for the active animation.
	 */
	private refreshComments (id: string, authorUsername?: string): void {
		this.showAllComments.set(false);

		if (/^\d+$/.test(id) && this.currentUser.profile()) {
			this.commentsService.fetchCommentsFromApi(Number(id), authorUsername).subscribe({
				next: (list) => this.comments.set(list),
				error: () => this.comments.set(this.commentsService.getComments(id, authorUsername)),
			});
			return;
		}

		const list = this.commentsService.getComments(id, authorUsername);
		this.comments.set(list);
	}

	/**
	 * Toggle like on the animation.
	 */
	protected toggleLike (): void {
		this.animation.update((curr) => {
			const nextLiked = !curr.liked;
			const nextLikes = nextLiked ? curr.likes + 1 : Math.max(0, curr.likes - 1);
			return {
				...curr,
				liked: nextLiked,
				likes: nextLikes,
			};
		});

		if (this.animation().liked) 
			this.snackbar.show('¡Te gustó esta animación!');
		
	}

	/**
	 * Toggle save / bookmark on the animation.
	 */
	protected toggleSave (): void {
		this.animation.update((curr) => {
			const nextSaved = !curr.saved;
			return {
				...curr,
				saved: nextSaved,
			};
		});

		if (this.animation().saved) 
			this.snackbar.show('Animación guardada en tu colección personal.');
		 else 
			this.snackbar.show('Animación removida de tu colección.');
		
	}

	/**
	 * Toggle author follow status using API when applicable.
	 */
	protected toggleFollow (): void {
		const authorId = this.animation().authorId;

		if (authorId) {
			const action = this.animation().isFollowing
				? this.usersService.unfollow({ id: authorId })
				: this.usersService.follow({ id: authorId });

			action.subscribe({
				next: (profile) => {
					this.animation.update((curr) => ({
						...curr,
						isFollowing: profile.youFollow,
						authorFollowers: profile.followers,
					}));
					this.snackbar.show(
						profile.youFollow
							? `Ahora sigues a @${profile.username}`
							: `Dejaste de seguir a @${profile.username}`
					);
				},
				error: () => {
					this.snackbar.show('No se pudo actualizar el estado de seguimiento.');
				},
			});
			return;
		}

		// Demo follow state
		this.animation.update((curr) => {
			const nextFollow = !curr.isFollowing;
			const nextFollowers = nextFollow
				? curr.authorFollowers + 1
				: curr.authorFollowers - 1;
			return {
				...curr,
				isFollowing: nextFollow,
				authorFollowers: nextFollowers,
			};
		});

		this.snackbar.show(
			this.animation().isFollowing
				? `Ahora sigues a @${this.animation().authorUsername}`
				: `Dejaste de seguir a @${this.animation().authorUsername}`
		);
	}

	/**
	 * Copy share link to clipboard.
	 */
	protected async shareAnimation (): Promise<void> {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(window.location.href);
				this.snackbar.show('¡Enlace copiado al portapapeles!');
			} else 
				this.snackbar.show(`Comparte este enlace: ${window.location.href}`);
			
		} catch {
			this.snackbar.show('No se pudo copiar automáticamente el enlace.');
		}
	}

	/**
	 * Open this animation in the editor to remix / modify it.
	 */
	protected openInEditor (): void {
		this.snackbar.show('Abriendo animación en el editor...');
		this.router.navigate([ '/editor' ]);
	}

	/**
	 * Submit a new comment via CommentsService.
	 */
	protected submitComment (): void {
		const text = this.newComment.trim();
		if (!text) 
			return;
		

		const username = this.currentUsername();
		const photo = this.currentUser.profile()?.photo ?? null;
		const isAuthor = username.toLowerCase() === this.animation().authorUsername.toLowerCase();

		const numericId = this.animation().numericId;
		if (numericId && this.currentUser.profile()) {
			this.commentsService.createCommentOnApi(numericId, text, undefined, this.animation().authorUsername).subscribe({
				next: (created) => {
					this.comments.update((curr) => [ created, ...curr ]);
					this.newComment = '';
					this.snackbar.show('¡Comentario publicado!');
				},
				error: (err: { error?: { message?: string } }) => {
					this.snackbar.show(err?.error?.message || 'No se pudo publicar el comentario.');
				},
			});
			return;
		}

		const updated = this.commentsService.addComment(
			this.animation().id,
			text,
			{ username, photo },
			isAuthor
		);

		this.comments.set(updated);
		this.newComment = '';
		this.snackbar.show('¡Comentario publicado!');
	}

	/**
	 * Toggle like on a comment.
	 */
	protected toggleCommentLike (comment: CommentItem): void {
		const numericId = this.animation().numericId;
		if (numericId && /^\d+$/.test(comment.id) && this.currentUser.profile()) {
			const commentNumericId = Number(comment.id);
			const nextLiked = !comment.liked;
			const req$ = nextLiked
				? this.commentsService.likeCommentOnApi(commentNumericId)
				: this.commentsService.unlikeCommentOnApi(commentNumericId);

			req$.subscribe({
				next: () => {
					this.comments.update((list) =>
						list.map((c) => {
							if (c.id === comment.id) 
								return {
									...c,
									liked: nextLiked,
									likes: nextLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
								};
							
							if (c.replies) 
								return {
									...c,
									replies: c.replies.map((r) =>
										r.id === comment.id
											? { ...r, liked: nextLiked, likes: nextLiked ? r.likes + 1 : Math.max(0, r.likes - 1) }
											: r
									),
								};
							
							return c;
						})
					);
				},
			});
			return;
		}

		const updated = this.commentsService.toggleLike(this.animation().id, comment.id);
		this.comments.set(updated);
	}

	/**
	 * Open inline reply box for a comment.
	 */
	protected startReply (commentId: string): void {
		this.replyingToId.set(commentId);
		this.replyText = '';
	}

	/**
	 * Cancel inline reply.
	 */
	protected cancelReply (): void {
		this.replyingToId.set(null);
		this.replyText = '';
	}

	/**
	 * Submit inline reply via CommentsService.
	 */
	protected submitReply (parentId: string): void {
		const text = this.replyText.trim();
		if (!text) 
			return;
		

		const username = this.currentUsername();
		const photo = this.currentUser.profile()?.photo ?? null;
		const isAuthor = username.toLowerCase() === this.animation().authorUsername.toLowerCase();

		const numericId = this.animation().numericId;
		if (numericId && /^\d+$/.test(parentId) && this.currentUser.profile()) {
			this.commentsService
				.createCommentOnApi(numericId, text, Number(parentId), this.animation().authorUsername)
				.subscribe({
					next: (created) => {
						this.comments.update((list) =>
							list.map((c) =>
								c.id === parentId
									? { ...c, replies: [ ...(c.replies ?? []), created ] }
									: c
							)
						);
						this.cancelReply();
						this.snackbar.show('Respuesta enviada.');
					},
					error: (err: { error?: { message?: string } }) => {
						this.snackbar.show(err?.error?.message || 'No se pudo enviar la respuesta.');
					},
				});
			return;
		}

		const updated = this.commentsService.addReply(
			this.animation().id,
			parentId,
			text,
			{ username, photo },
			isAuthor
		);

		this.comments.set(updated);
		this.cancelReply();
		this.snackbar.show('Respuesta enviada.');
	}

	/**
	 * Delete a comment or reply.
	 */
	protected deleteComment (commentId: string): void {
		if (this.replyingToId() === commentId)
			this.cancelReply();

		const numericId = this.animation().numericId;
		if (numericId && /^\d+$/.test(commentId) && this.currentUser.profile()) {
			this.commentsService.deleteCommentOnApi(Number(commentId)).subscribe({
				next: () => {
					this.comments.update((list) =>
						list
							.filter((c) => c.id !== commentId)
							.map((c) =>
								c.replies && 0 < c.replies.length
									? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
									: c
							)
					);
					this.snackbar.show('Comentario eliminado.');
				},
				error: (err: { error?: { message?: string } }) => {
					this.snackbar.show(err?.error?.message || 'No se pudo eliminar el comentario.');
				},
			});
			return;
		}

		const updated = this.commentsService.deleteComment(this.animation().id, commentId);
		this.comments.set(updated);
		this.snackbar.show('Comentario eliminado.');
	}

	/**
	 * Open report dialog for the animation.
	 */
	protected openReportModal (): void {
		if (this.isSelf(this.animation().authorUsername)) {
			this.snackbar.show('No puedes reportar tu propio contenido.');
			return;
		}
		this.reportTarget.set({
			type: 'animation',
			targetId: this.animation().id,
			numericTargetId: this.animation().numericId,
			targetName: this.animation().title,
			reportedUsername: this.animation().authorUsername,
		});
		this.reportSubmitted.set(false);
		this.isSubmittingReport.set(false);
		this.reportCategory.set('obscene');
		this.reportDetails = '';
		this.showReportModal.set(true);
	}

	/**
	 * Open report dialog for the author user profile.
	 */
	protected openReportUserModal (username: string, authorName?: string): void {
		if (this.isSelf(username)) {
			this.snackbar.show('No puedes reportar tu propio perfil.');
			return;
		}
		const authorId = username === this.animation().authorUsername ? this.animation().authorId : undefined;
		this.reportTarget.set({
			type: 'user',
			targetId: username,
			numericTargetId: authorId,
			targetName: authorName || `@${username}`,
			reportedUsername: username,
		});
		this.reportSubmitted.set(false);
		this.isSubmittingReport.set(false);
		this.reportCategory.set('harassment');
		this.reportDetails = '';
		this.showReportModal.set(true);
	}

	/**
	 * Open report dialog for an individual comment or reply.
	 */
	protected openReportCommentModal (comment: CommentItem): void {
		if (this.isSelf(comment.username)) {
			this.snackbar.show('No puedes reportar tu propio comentario.');
			return;
		}
		this.reportTarget.set({
			type: 'comment',
			targetId: comment.id,
			numericTargetId: /^\d+$/.test(comment.id) ? Number(comment.id) : undefined,
			targetName: comment.author,
			commentSnippet: 70 < comment.content.length ? comment.content.slice(0, 67) + '...' : comment.content,
			reportedUsername: comment.username,
		});
		this.reportSubmitted.set(false);
		this.isSubmittingReport.set(false);
		this.reportCategory.set('harassment');
		this.reportDetails = '';
		this.showReportModal.set(true);
	}

	/**
	 * Close report dialog.
	 */
	protected closeReportModal (): void {
		this.showReportModal.set(false);
		this.reportTarget.set(null);
	}

	/**
	 * Submit abuse / issue report.
	 */
	protected submitReport (): void {
		if (this.isSubmittingReport() || this.reportSubmitted()) 
			return;
		

		const target = this.reportTarget();
		if (!target || this.isSelf(target.reportedUsername)) {
			this.snackbar.show('No es posible enviar este reporte.');
			this.closeReportModal();
			return;
		}

		this.isSubmittingReport.set(true);

		if (target.numericTargetId && this.currentUser.profile()) {
			this.reportsService
				.submitReport({
					targetType: target.type,
					targetId: target.numericTargetId,
					category: this.reportCategory(),
					details: this.reportDetails.trim() || null,
				})
				.subscribe({
					next: () => {
						this.isSubmittingReport.set(false);
						this.reportSubmitted.set(true);
						setTimeout(() => {
							this.showReportModal.set(false);
							const feedback = 'animation' === target.type
								? 'Reporte recibido. Nuestro equipo de moderación revisará esta animación. ¡Gracias!'
								: 'user' === target.type
									? 'Reporte recibido. El perfil de usuario ha sido remitido a moderación. ¡Gracias!'
									: 'Reporte recibido. El comentario ha sido remitido a moderación. ¡Gracias!';
							this.snackbar.show(feedback);
						}, 1200);
					},
					error: (err: { error?: { message?: string } }) => {
						this.isSubmittingReport.set(false);
						this.snackbar.show(err?.error?.message || 'No se pudo enviar el reporte.');
					},
				});
			return;
		}

		// Record report persistently in localStorage
		const reportEntry = {
			id: `rep_${Date.now()}`,
			type: target.type,
			targetId: target.targetId,
			targetName: target.targetName,
			commentSnippet: target.commentSnippet,
			reportedUser: target.reportedUsername,
			reportingUser: this.currentUser.profile()?.username ?? 'anónimo',
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
				const feedback = 'animation' === target.type
					? 'Reporte recibido. Nuestro equipo de moderación revisará esta animación. ¡Gracias!'
					: 'user' === target.type
						? 'Reporte recibido. El perfil de usuario ha sido remitido a moderación. ¡Gracias!'
						: 'Reporte recibido. El comentario ha sido remitido a moderación. ¡Gracias!';
				this.snackbar.show(feedback);
			}, 1400);
		}, 600);
	}

	/**
	 * Play or restart cube animation.
	 */
	protected playAnimation (): void {
		this.cubeRef?.run(this.animation().program);
	}

	/**
	 * Stop/pause cube animation.
	 */
	protected stopAnimation (): void {
		this.cubeRef?.stop();
	}

	/**
	 * Reset cube to blank/environment state.
	 */
	protected resetAnimation (): void {
		this.cubeRef?.reset();
	}
}
