/**
 * AES-256-GCM encryption for BYOK keys at rest — see docs/spec.html §09.
 * Format stored in DB: base64(iv).base64(ciphertext+tag)
 * Uses Node's WebCrypto (works under adapter-node).
 */
import { env } from '$env/dynamic/private';

// Node 20 exposes WebCrypto as the `crypto` global with DOM-compatible types.
const enc = new TextEncoder();
const dec = new TextDecoder();

async function key(): Promise<CryptoKey> {
	const raw = Buffer.from(env.ENCRYPTION_KEY ?? '', 'base64');
	if (raw.length !== 32) {
		throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
	}
	return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), enc.encode(plaintext));
	return `${Buffer.from(iv).toString('base64')}.${Buffer.from(ct).toString('base64')}`;
}

export async function decryptSecret(stored: string): Promise<string> {
	const [ivB64, ctB64] = stored.split('.');
	const iv = Buffer.from(ivB64, 'base64');
	const ct = Buffer.from(ctB64, 'base64');
	const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await key(), ct);
	return dec.decode(pt);
}
