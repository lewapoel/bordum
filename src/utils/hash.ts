export async function getHashCode(str: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);

  const view = new DataView(hashBuffer);
  const int32 = view.getInt32(0, false);

  const clamped = int32 & 0x7fffffff; // remove negative sign
  return clamped.toString();
}
