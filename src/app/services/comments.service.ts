import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '@environment';

export interface CommentItem {
	id: string;
	author: string;
	username: string;
	authorPhoto: string | null;
	createdAt: string;
	relativeTime: string;
	content: string;
	likes: number;
	liked: boolean;
	isAuthor?: boolean;
	replies?: CommentItem[];
}

export interface ApiCommentResponse {
	id: number;
	creationId: number;
	userId: number;
	username: string;
	authorPhoto: string | null;
	content: string;
	likesCount: number;
	likedByViewer: boolean;
	parentCommentId: number | null;
	createdAt: string;
	replies: ApiCommentResponse[];
}

const STORAGE_PREFIX = 'kuv_comments_';

/**
 * Formats an ISO timestamp into a concise Spanish relative time string.
 */
function formatRelativeTime (isoDate: string): string {
	const diffMs = Date.now() - new Date(isoDate).getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (1 > diffMin) 
		return 'Hace un momento';
	
	if (60 > diffMin) 
		return `hace ${diffMin} min`;
	
	const diffHours = Math.floor(diffMin / 60);
	if (24 > diffHours) 
		return 1 === diffHours ? 'hace 1 hora' : `hace ${diffHours} horas`;
	
	const diffDays = Math.floor(diffHours / 24);
	return 1 === diffDays ? 'hace 1 día' : `hace ${diffDays} días`;
}

/**
 * Maps an API comment response into the UI CommentItem shape.
 */
function mapApiComment (api: ApiCommentResponse, authorUsername?: string): CommentItem {
	const photo = api.authorPhoto ? `${environment.apiUrl}${api.authorPhoto}` : null;
	const isAuthor = authorUsername ? api.username.toLowerCase() === authorUsername.toLowerCase() : false;

	return {
		id: String(api.id),
		author: api.username,
		username: api.username,
		authorPhoto: photo,
		createdAt: api.createdAt,
		relativeTime: formatRelativeTime(api.createdAt),
		content: api.content,
		likes: api.likesCount,
		liked: api.likedByViewer,
		isAuthor,
		replies: (api.replies ?? []).map((r) => mapApiComment(r, authorUsername)),
	};
}

/**
 * Service to manage comments and replies per animation.
 * Uses the backend API for persisted creations and falls back to localStorage for offline/demo items.
 */
@Injectable({ providedIn: 'root' })
export class CommentsService {
	private readonly http = inject(HttpClient, { optional: true });

	/**
	 * Fetches comments for a creation from the backend API.
	 */
	fetchCommentsFromApi (creationId: number, authorUsername?: string): Observable<CommentItem[]> {
		if (!this.http) 
			return throwError(() => new Error('HttpClient not available'));
		
		return this.http
			.get<ApiCommentResponse[]>(`${environment.apiUrl}/creations/${creationId}/comments`)
			.pipe(map((list) => list.map((item) => mapApiComment(item, authorUsername))));
	}

	/**
	 * Posts a new comment or reply to the backend API.
	 */
	createCommentOnApi (
		creationId: number,
		content: string,
		parentCommentId?: number,
		authorUsername?: string
	): Observable<CommentItem> {
		if (!this.http) 
			return throwError(() => new Error('HttpClient not available'));
		
		return this.http
			.post<ApiCommentResponse>(`${environment.apiUrl}/creations/${creationId}/comments`, {
				content,
				parentCommentId: parentCommentId ?? null,
			})
			.pipe(map((item) => mapApiComment(item, authorUsername)));
	}

	/**
	 * Deletes a comment on the backend API.
	 */
	deleteCommentOnApi (commentId: number): Observable<void> {
		if (!this.http) 
			return throwError(() => new Error('HttpClient not available'));
		
		return this.http.delete<void>(`${environment.apiUrl}/comments/${commentId}`);
	}

	/**
	 * Likes a comment on the backend API.
	 */
	likeCommentOnApi (commentId: number): Observable<void> {
		if (!this.http) 
			return throwError(() => new Error('HttpClient not available'));
		
		return this.http.put<void>(`${environment.apiUrl}/comments/${commentId}/like`, {});
	}

	/**
	 * Removes a like from a comment on the backend API.
	 */
	unlikeCommentOnApi (commentId: number): Observable<void> {
		if (!this.http) 
			return throwError(() => new Error('HttpClient not available'));
		
		return this.http.delete<void>(`${environment.apiUrl}/comments/${commentId}/like`);
	}
	/**
	 * Get comments for a specific animation.
	 */
	getComments (animationId: string, authorUsername?: string): CommentItem[] {
		const raw = localStorage.getItem(`${STORAGE_PREFIX}${animationId}`);
		if (raw) 
			try {
				return JSON.parse(raw) as CommentItem[];
			} catch {
				// Corrupted JSON fallback
			}
		

		// Initial seed comments for rich experience if none yet
		const defaults = this.createDefaultComments(animationId, authorUsername);
		this.saveComments(animationId, defaults);
		return defaults;
	}

	/**
	 * Add a new top-level comment.
	 */
	addComment (
		animationId: string,
		content: string,
		user: { username: string; photo?: string | null },
		isAuthor = false
	): CommentItem[] {
		const comments = this.getComments(animationId);
		const newComment: CommentItem = {
			id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
			author: user.username,
			username: user.username.toLowerCase().replace(/\s+/g, '_'),
			authorPhoto: user.photo ?? null,
			createdAt: new Date().toISOString(),
			relativeTime: 'Hace un momento',
			content: content.trim(),
			likes: 0,
			liked: false,
			isAuthor,
			replies: [],
		};

		const updated = [ newComment, ...comments ];
		this.saveComments(animationId, updated);
		return updated;
	}

	/**
	 * Add a reply to an existing comment.
	 */
	addReply (
		animationId: string,
		parentCommentId: string,
		content: string,
		user: { username: string; photo?: string | null },
		isAuthor = false
	): CommentItem[] {
		const comments = this.getComments(animationId);
		const newReply: CommentItem = {
			id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
			author: user.username,
			username: user.username.toLowerCase().replace(/\s+/g, '_'),
			authorPhoto: user.photo ?? null,
			createdAt: new Date().toISOString(),
			relativeTime: 'Hace un momento',
			content: content.trim(),
			likes: 0,
			liked: false,
			isAuthor,
		};

		const updated = comments.map((c) => {
			if (c.id === parentCommentId) 
				return {
					...c,
					replies: [ ...(c.replies ?? []), newReply ],
				};
			
			return c;
		});

		this.saveComments(animationId, updated);
		return updated;
	}

	/**
	 * Delete a comment or reply by its id.
	 */
	deleteComment (animationId: string, commentId: string): CommentItem[] {
		const comments = this.getComments(animationId);
		const updated = comments
			.filter((c) => c.id !== commentId)
			.map((c) => {
				if (c.replies && 0 < c.replies.length) 
					return {
						...c,
						replies: c.replies.filter((r) => r.id !== commentId),
					};
				
				return c;
			});

		this.saveComments(animationId, updated);
		return updated;
	}

	/**
	 * Toggle like on a comment or reply.
	 */
	toggleLike (animationId: string, commentId: string): CommentItem[] {
		const comments = this.getComments(animationId);
		const updated = comments.map((c) => {
			if (c.id === commentId) {
				const liked = !c.liked;
				return {
					...c,
					liked,
					likes: liked ? c.likes + 1 : Math.max(0, c.likes - 1),
				};
			}
			if (c.replies) 
				return {
					...c,
					replies: c.replies.map((r) => {
						if (r.id === commentId) {
							const liked = !r.liked;
							return {
								...r,
								liked,
								likes: liked ? r.likes + 1 : Math.max(0, r.likes - 1),
							};
						}
						return r;
					}),
				};
			
			return c;
		});

		this.saveComments(animationId, updated);
		return updated;
	}

	private saveComments (animationId: string, comments: CommentItem[]): void {
		try {
			localStorage.setItem(`${STORAGE_PREFIX}${animationId}`, JSON.stringify(comments));
		} catch {
			// Local storage full or unavailable
		}
	}

	private createDefaultComments (animationId: string, authorUsername = 'sofia_creative'): CommentItem[] {
		return [
			{
				id: `c_${animationId}_1`,
				author: 'Carlos Dev',
				username: 'carlos_k',
				authorPhoto: null,
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
				relativeTime: 'hace 18 horas',
				content:
					'¡El efecto de transición entre las esquinas del cubo quedó increíble! ¿Cómo resolviste la sincronización al girar las caras?',
				likes: 14,
				liked: false,
				replies: [
					{
						id: `r_${animationId}_1_1`,
						author: 'sofia_creative' === authorUsername ? 'Sofia Medina' : authorUsername,
						username: authorUsername,
						authorPhoto: null,
						createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
						relativeTime: 'hace 16 horas',
						content:
							'¡Gracias! Usé un bucle anidado sincronizado con pasos de retardo perimetrales. Si le das a "Remix en Editor" puedes ver el código exacto en bloques.',
						likes: 6,
						liked: false,
						isAuthor: true,
					},
				],
			},
			{
				id: `c_${animationId}_2`,
				author: 'Elena Robles',
				username: 'elena_art',
				authorPhoto: null,
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
				relativeTime: 'hace 4 horas',
				content:
					'Lo transmití a mi cubo KUV físico en la sala y los contrastes se ven geniales en vivo. ¡Gran aporte a la galería!',
				likes: 9,
				liked: true,
			},
			{
				id: `c_${animationId}_3`,
				author: 'Marcos Maker',
				username: 'marcos_diy',
				authorPhoto: null,
				createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
				relativeTime: 'hace 2 horas',
				content:
					'Guardada en mis favoritos para usar de base en mi próxima instalación de LEDs.',
				likes: 3,
				liked: false,
			},
		];
	}
}

