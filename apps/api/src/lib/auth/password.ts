import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AuthError } from "./error";

const parameters = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let activeHashes = 0;

async function derive(password: string, salt: string): Promise<Buffer> {
  // Evitar filas ilimitadas e consumo excessivo de memória por instância.
  if (activeHashes >= 2) throw new AuthError(503, "Autenticação ocupada. Tente novamente em instantes.");
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, parameters, (error, key) => error ? reject(error) : resolve(key));
    });
  } finally {
    activeHashes--;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$131072$8$1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const valid = /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored ?? "");
  // Contas inexistentes/inativas também executam o mesmo trabalho criptográfico.
  const parts = valid ? stored!.split("$") : [];
  const actual = await derive(password, parts[4] ?? "0".repeat(32));
  const expected = Buffer.from(parts[5] ?? "0".repeat(128), "hex");
  return timingSafeEqual(actual, expected) && valid;
}
