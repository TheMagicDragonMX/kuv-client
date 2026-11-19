import { TestBed } from '@angular/core/testing';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
	let service: CommentsService;
	const testAnimId = 'test_anim_123';

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [ CommentsService ],
		});
		service = TestBed.inject(CommentsService);
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('should initialize default comments if none exist', () => {
		const comments = service.getComments(testAnimId, 'author_user');
		expect(comments.length).toBeGreaterThan(0);
	});

	it('should add a new comment', () => {
		const initial = service.getComments(testAnimId);
		const updated = service.addComment(testAnimId, '¡Excelente animación!', {
			username: 'test_user',
			photo: null,
		});

		expect(updated.length).toBe(initial.length + 1);
		expect(updated[0].content).toBe('¡Excelente animación!');
		expect(updated[0].author).toBe('test_user');
	});

	it('should add a reply to an existing comment', () => {
		const comments = service.getComments(testAnimId);
		const targetId = comments[0].id;
		const updated = service.addReply(testAnimId, targetId, 'Muchas gracias!', {
			username: 'author_user',
		}, true);

		const parent = updated.find((c) => c.id === targetId);
		expect(parent?.replies?.some((r) => 'Muchas gracias!' === r.content)).toBe(true);
	});

	it('should delete a top-level comment', () => {
		const comments = service.getComments(testAnimId);
		const targetId = comments[0].id;
		const updated = service.deleteComment(testAnimId, targetId);

		expect(updated.some((c) => c.id === targetId)).toBe(false);
		expect(updated.length).toBe(comments.length - 1);
	});

	it('should delete a nested reply', () => {
		const comments = service.getComments(testAnimId);
		const parent = comments.find((c) => c.replies && 0 < c.replies.length);
		expect(parent).toBeDefined();

		const replyId = parent!.replies![0].id;
		const updated = service.deleteComment(testAnimId, replyId);

		const updatedParent = updated.find((c) => c.id === parent!.id);
		expect(updatedParent?.replies?.some((r) => r.id === replyId)).toBe(false);
	});

	it('should toggle like on a comment', () => {
		const comments = service.getComments(testAnimId);
		const target = comments[0];
		const wasLiked = target.liked;
		const likesBefore = target.likes;

		const updated = service.toggleLike(testAnimId, target.id);
		const updatedComment = updated.find((c) => c.id === target.id);

		expect(updatedComment?.liked).toBe(!wasLiked);
		expect(updatedComment?.likes).toBe(wasLiked ? likesBefore - 1 : likesBefore + 1);
	});
});

