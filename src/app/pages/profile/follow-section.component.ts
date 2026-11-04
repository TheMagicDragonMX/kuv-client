import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	model,
	output,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { AvatarComponent } from '../../components/avatar.component';
import { Profile, UserSummary, UsersApi } from '../../services/users-api.service';

/**
 * The two lists of the section.
 */
export type FollowList = 'following' | 'followers';

/**
 * Milliseconds the search waits after the last key before asking the server.
 */
const SEARCH_DELAY = 250;

/**
 * Fewest letters a search needs before the server is asked.
 */
const MIN_SEARCH = 2;

/**
 * How two users relate, in words, or null when neither follows the other.
 */
export function relationOf (user: Pick<UserSummary, 'followsYou' | 'youFollow'>): string | null {
	if (user.followsYou && user.youFollow)
		return 'Se siguen';

	if (user.youFollow)
		return 'Siguiendo';

	return user.followsYou ? 'Te sigue' : null;
}

/**
 * What the follow button says for a user.
 */
export function followLabel (user: Pick<UserSummary, 'followsYou' | 'youFollow'>): string {
	if (user.youFollow)
		return 'Dejar de seguir';

	return user.followsYou ? 'Seguir también' : 'Seguir';
}

/**
 * The followers and followed section of the profile: on one side the two lists (who the user
 * follows, who follows them) with a search that also finds other people, on the other the person
 * picked, with the button to follow them or stop. A badge on each row says how they relate:
 * "Te sigue", "Siguiendo", or "Se siguen" when they follow each other.
 */
@Component({
	selector: 'app-follow-section',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ NgTemplateOutlet, AvatarComponent ],
	templateUrl: './follow-section.component.html',
})
export class FollowSectionComponent {
	/**
	 * The signed-in user's profile, whose lists are shown.
	 */
	readonly me = input.required<Profile>();

	/**
	 * The list shown. Two-way, so the counts of the profile can open one.
	 */
	readonly list = model<FollowList>('following');

	/**
	 * Someone was followed or unfollowed, so the counts of the profile changed.
	 */
	readonly changed = output<void>();

	/**
	 * Words for how two users relate.
	 */
	protected readonly relationOf = relationOf;

	/**
	 * Words of the follow button.
	 */
	protected readonly followLabel = followLabel;

	/**
	 * The users the signed-in user follows, or null until they are loaded.
	 */
	protected readonly following = signal<UserSummary[] | null>(null);

	/**
	 * The users who follow the signed-in user, or null until they are loaded.
	 */
	protected readonly followers = signal<UserSummary[] | null>(null);

	/**
	 * What is typed in the search.
	 */
	protected readonly query = signal('');

	/**
	 * Other people the server found for the search.
	 */
	protected readonly found = signal<UserSummary[]>([]);

	/**
	 * The user picked, or null for the first of the list.
	 */
	protected readonly pickedId = signal<number | null>(null);

	/**
	 * Why something failed, or null.
	 */
	protected readonly problem = signal<string | null>(null);

	/**
	 * True while a follow or unfollow is on its way.
	 */
	protected readonly busy = signal(false);

	/**
	 * The users of the list shown, or null while it loads.
	 */
	protected readonly users = computed(() => 'following' === this.list() ? this.following() : this.followers());

	/**
	 * The users of the list whose name has what is typed.
	 */
	protected readonly shown = computed(() => {
		const text = this.query().trim().toLowerCase();

		return (this.users() ?? []).filter((user) => user.username.toLowerCase().includes(text));
	});

	/**
	 * People the search found who are not in the list shown.
	 */
	protected readonly others = computed(() => {
		const inList = new Set((this.users() ?? []).map((user) => user.id));

		return this.found().filter((user) => !inList.has(user.id));
	});

	/**
	 * The user whose details are shown: the one picked, or the first one there is.
	 */
	protected readonly picked = computed<UserSummary | null>(() => {
		const everyone = [ ...this.shown(), ...this.others() ];

		return everyone.find((user) => this.pickedId() === user.id) ?? everyone[0] ?? null;
	});

	/**
	 * Talks to the API.
	 */
	private readonly usersApi = inject(UsersApi);

	/**
	 * The panel with the details, to bring it into view on small screens.
	 */
	private readonly details = viewChild<ElementRef<HTMLElement>>('details');

	/**
	 * The search waiting to be sent, or null.
	 */
	private searchTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Loads the lists of the user, and again if the user changes.
	 */
	constructor () {
		effect(() => {
			const id = this.me().id;

			untracked(() => this.load(id));
		});

		inject(DestroyRef).onDestroy(() => this.cancelSearch());
	}

	/**
	 * Shows the list of followed users or of followers.
	 */
	protected show (list: FollowList): void {
		this.list.set(list);
		this.pickedId.set(null);
	}

	/**
	 * Filters the list by what is typed, and after a short pause asks the server for other people.
	 */
	protected search (text: string): void {
		this.query.set(text);
		this.cancelSearch();

		if (MIN_SEARCH > text.trim().length) {
			this.found.set([]);
			return;
		}

		this.searchTimer = setTimeout(() => {
			this.searchTimer = null;
			this.usersApi.search(text.trim()).subscribe({
				next: (users) => {
					if (text === this.query())
						this.found.set(users);
				},
				error: () => this.found.set([]),
			});
		}, SEARCH_DELAY);
	}

	/**
	 * Picks a user to see their details. On a small screen the details are below the list, so
	 * they are brought into view.
	 */
	protected pick (user: UserSummary): void {
		this.pickedId.set(user.id);

		if (window.matchMedia?.('(max-width: 63.99rem)').matches) {
			const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			setTimeout(() => this.details()?.nativeElement.scrollIntoView?.({ block: 'start', behavior: calm ? 'auto' : 'smooth' }));
		}
	}

	/**
	 * Follows the user, or stops following them, and loads the lists again.
	 */
	protected toggleFollow (user: UserSummary): void {
		this.busy.set(true);
		this.problem.set(null);

		const request = user.youFollow ? this.usersApi.unfollow(user.id) : this.usersApi.follow(user.id);

		request.subscribe({
			next: (profile) => {
				this.found.update((found) => found.map((other) => profile.id === other.id
					? { ...other, followers: profile.followers, followsYou: profile.followsYou, youFollow: profile.youFollow }
					: other));
				this.pickedId.set(user.id);
				this.load(this.me().id);
				this.changed.emit();
				this.busy.set(false);
			},
			error: (error: HttpErrorResponse) => {
				this.problem.set(0 === error.status ? 'No se pudo conectar con el servidor.' : 'No se pudo cambiar a quién sigues. Inténtalo de nuevo.');
				this.busy.set(false);
			},
		});
	}

	/**
	 * Loads both lists of a user.
	 */
	protected load (id: number): void {
		forkJoin({ following: this.usersApi.following(id), followers: this.usersApi.followers(id) }).subscribe({
			next: ({ following, followers }) => {
				this.following.set(following);
				this.followers.set(followers);
				this.problem.set(null);
			},
			error: () => {
				this.following.set(this.following() ?? []);
				this.followers.set(this.followers() ?? []);
				this.problem.set('No se pudieron cargar tus seguidores y seguidos.');
			},
		});
	}

	/**
	 * Drops the search waiting to be sent.
	 */
	private cancelSearch (): void {
		if (this.searchTimer)
			clearTimeout(this.searchTimer);

		this.searchTimer = null;
	}
}
