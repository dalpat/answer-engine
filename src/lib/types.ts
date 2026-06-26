import type { Phase, SourceCard } from '$lib/events';

/** One Q&A turn in a conversation (client-side view model). */
export interface Turn {
	question: string;
	phase: Phase | null;
	queries: string[];
	sources: SourceCard[];
	answer: string;
	related: string[];
	elapsed: number | null;
	error: string;
	running: boolean;
	stepsOpen: boolean;
}

export function emptyTurn(question: string): Turn {
	return {
		question,
		phase: null, // search mode sets this via status events; chat leaves it null (no stepper)
		queries: [],
		sources: [],
		answer: '',
		related: [],
		elapsed: null,
		error: '',
		running: true,
		stepsOpen: true
	};
}
