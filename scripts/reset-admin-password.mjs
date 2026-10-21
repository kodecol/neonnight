// Restablece la contraseña del panel cuando se perdió (no hay "olvidé mi
// contraseña": es un solo administrador y no hay correo de recuperación).
//
// - Lee la contraseña nueva por stdin (nunca como argumento, que queda en el
//   historial y en `ps`). Mínimo 12 caracteres, igual que el panel.
// - Guarda el hash scrypt en `settings/admin` con el mismo formato que
//   src/infrastructure/auth/password.ts y sube la versión de sesión: todas las
//   sesiones abiertas se cierran.
// - Con --usar-entorno borra el hash y vuelve a regir ADMIN_PASSWORD del
//   servidor (también cierra las sesiones).
//
// Uso (desde la raíz del repo, variables en el entorno, nunca en la línea de comandos):
//   printf '%s' "$NUEVA" | node scripts/reset-admin-password.mjs
//   node scripts/reset-admin-password.mjs            (la pide sin eco en la terminal)
//   node scripts/reset-admin-password.mjs --usar-entorno
// Variables: MONGODB_URI y MONGODB_DB (por defecto neonnight).
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { MongoClient } from "mongodb";

const USE_ENV = process.argv.includes("--usar-entorno");
const MIN = 12;
const [N, R, P, KEYLEN] = [32_768, 8, 1, 32];

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en el entorno.");
  process.exit(1);
}

async function readPassword() {
  const tty = process.stdin.isTTY;
  if (tty) {
    process.stdout.write("Contraseña nueva: ");
    process.stdin.setRawMode(true);
  }
  let value = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    if (!tty) {
      value += chunk;
      continue;
    }
    for (const ch of chunk) {
      if (ch === "\r" || ch === "\n") {
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        return value;
      }
      if (ch === "\u0003") process.exit(130); // Ctrl+C
      value = ch === "\u007f" ? value.slice(0, -1) : value + ch;
    }
  }
  return value.replace(/\r?\n$/, "");
}

function hash(plain) {
  const salt = randomBytes(16);
  return new Promise((ok, ko) =>
    scryptCb(plain.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 }, (e, key) =>
      e ? ko(e) : ok(["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$")),
    ),
  );
}

let passwordHash = null;
if (!USE_ENV) {
  const plain = await readPassword();
  if (plain.length < MIN) {
    console.error(`La contraseña debe tener al menos ${MIN} caracteres.`);
    process.exit(1);
  }
  passwordHash = await hash(plain);
}

const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "neonnight").collection("settings");
  const prev = await col.findOne({ _id: "admin" });
  const sessionVersion = (prev?.sessionVersion ?? 0) + 1;
  await col.replaceOne(
    { _id: "admin" },
    { _id: "admin", passwordHash, sessionVersion, passwordChangedAt: passwordHash ? new Date() : (prev?.passwordChangedAt ?? null), updatedAt: new Date() },
    { upsert: true },
  );
  console.log(passwordHash ? "Contraseña restablecida." : "Rige otra vez ADMIN_PASSWORD del servidor.", `Sesiones cerradas (versión ${sessionVersion}).`);
} finally {
  await client.close();
}
