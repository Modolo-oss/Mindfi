import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

export function privateKeyToAddress(privateKey: string): string {
  const privKeyBytes = hexToBytes(privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey);
  const publicKey = secp256k1.getPublicKey(privKeyBytes, false);
  const pubKeyWithoutPrefix = publicKey.slice(1);
  const hash = keccak_256(pubKeyWithoutPrefix);
  const addressBytes = hash.slice(-20);
  return "0x" + bytesToHex(addressBytes);
}

export function privateKeyToAccount(privateKey: `0x${string}`): { address: `0x${string}` } {
  const address = privateKeyToAddress(privateKey) as `0x${string}`;
  return { address };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
