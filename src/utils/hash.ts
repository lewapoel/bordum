export async function getHashCode(str: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", textAsBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");

  return parseInt(hash.slice(0, 8), 16).toString();
}
