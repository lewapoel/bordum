import { v4 as uuidv4 } from 'uuid';

export async function getHashCode(str: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);

  const view = new DataView(hashBuffer);
  const int32 = view.getInt32(0, false);

  const clamped = int32 & 0x7fffffff; // remove negative sign
  return clamped.toString();
}

export function generateRandomCode(): string {
  return uuidv4().replace(/-/g, '').slice(0, 32);
}

export async function generateHashCode(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex.slice(0, 32);
}
