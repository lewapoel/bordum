// src/utils/time.js

// Returns the current timestamp in seconds
export function getCurrentTimestamp() {
  return Math.floor(new Date().getTime() / 1000);
}
