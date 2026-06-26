/**
 * The typed event stream that drives the whole live-progress UX — docs/spec.html §06.
 * The frontend is a pure reducer over these events.
 * Shared between server (emitter) and client (consumer), hence in $lib not $lib/server.
 */

export type Phase = 'understanding' | 'searching' | 'reading' | 'answering';

export interface SourceCard {
	n: number;
	url: string;
	title: string;
	domain: string;
	favicon?: string;
	snippet?: string;
}

export type AskEvent =
	| { type: 'status'; phase: Phase; queries?: string[]; count?: number }
	| { type: 'sources'; sources: SourceCard[] }
	| { type: 'token'; text: string }
	| { type: 'related'; questions: string[] }
	| { type: 'done'; elapsedMs: number }
	| { type: 'error'; message: string };

/** SSE wire framing: one JSON object per `data:` line. */
export function encodeEvent(ev: AskEvent): string {
	return `data: ${JSON.stringify(ev)}\n\n`;
}
