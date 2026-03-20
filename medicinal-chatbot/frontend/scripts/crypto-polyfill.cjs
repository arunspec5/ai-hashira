/**
 * Polyfill for crypto.getRandomValues on older Node.js (e.g. CentOS with Node < 19).
 * Fixes: TypeError: crypto.getRandomValues is not a function
 */
const nodeCrypto = require("crypto");

if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
  const webcrypto = nodeCrypto.webcrypto;
  if (webcrypto && typeof webcrypto.getRandomValues === "function") {
    globalThis.crypto = webcrypto;
  } else {
    globalThis.crypto = globalThis.crypto || {};
    globalThis.crypto.getRandomValues = function getRandomValues(arr) {
      const bytes = nodeCrypto.randomBytes(arr.length);
      arr.set(bytes);
      return arr;
    };
  }
}
