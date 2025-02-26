import crypto from "crypto";

export function getHashCode(str: string): string {
  return parseInt(
    crypto.createHash("sha256").update(str).digest("hex").slice(0, 8),
    16,
  ).toString();
}
