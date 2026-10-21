"use client";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/presentation/components/primitives/Button";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { cn } from "@/presentation/lib/cn";

export type LoginState = { error: string | null };

export function LoginForm({ wordmark, login, configured }: { wordmark: string; login: (prev: LoginState, fd: FormData) => Promise<LoginState>; configured: boolean }) {
  const [state, action, pending] = useActionState(login, { error: null });
  // La cookie de sesión es Secure: por http el navegador la descarta y cada clic vuelve aquí.
  const [insecure, setInsecure] = useState(false);
  useEffect(() => {
    const { protocol, hostname } = window.location;
    setInsecure(protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1");
  }, []);
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <span className="fixed inset-x-0 top-0 h-[2px] bg-accent" aria-hidden="true" />
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <Isotype size={48} priority />
          <span className="mt-7 text-label-lg uppercase tracking-[0.34em] text-ink">{wordmark}</span>
          <span className="mt-2 text-kicker uppercase text-ink-3">Panel de administración</span>
        </div>

        {insecure && (
          <p role="alert" className="m-0 mt-10 border-l-2 border-accent bg-surface px-4 py-3 text-legal text-ink-2" data-testid="https-warning">
            El panel requiere HTTPS. Entra por{" "}
            <a href={`https://${typeof window === "undefined" ? "" : window.location.host}/admin/login`} className="text-ink underline decoration-accent underline-offset-4">
              la dirección segura
            </a>
            .
          </p>
        )}

        <form action={action} className="mt-14">
          <label htmlFor="password" className="mb-2.5 block text-label uppercase text-ink-2">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            disabled={!configured}
            aria-invalid={state.error ? true : undefined}
            className={cn(
              "block w-full border bg-transparent px-4 py-4 text-meta text-ink outline-none transition-colors focus:border-ink disabled:opacity-45",
              state.error ? "border-accent" : "border-border",
            )}
          />
          {state.error && (
            <p role="alert" className="m-0 mt-2.5 text-label-sm uppercase text-accent">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending || !configured} className="mt-8 w-full justify-center">
            {pending ? "Verificando…" : "Entrar"}
          </Button>
        </form>

        {!configured && (
          <p className="m-0 mt-8 text-center text-legal text-ink-2">
            El panel no está configurado. Define <span className="text-ink">ADMIN_PASSWORD</span> y <span className="text-ink">ADMIN_SECRET</span> (32+ caracteres) en el
            entorno del servidor.
          </p>
        )}
      </div>
    </div>
  );
}
