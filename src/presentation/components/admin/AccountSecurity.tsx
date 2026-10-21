"use client";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/application/dto/admin.dto";
import { MIN_PASSWORD_LENGTH, type AccountView, type ChangePasswordInput } from "@/application/dto/account.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { cn } from "@/presentation/lib/cn";
import { FormSection, TextInput } from "./fields";

type Message = { ok: boolean; text: string } | null;

export function AccountSecurity({
  initial,
  changePassword,
  revokeSessions,
}: {
  initial: AccountView;
  changePassword: (input: ChangePasswordInput) => Promise<ActionResult<AccountView>>;
  revokeSessions: () => Promise<ActionResult<AccountView>>;
}) {
  const [view, setView] = useState(initial);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message>(null);
  const [revokeMessage, setRevokeMessage] = useState<Message>(null);
  const [pending, start] = useTransition();
  const [revoking, startRevoke] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await changePassword({ current, next, confirm });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setErrors({});
      setView(res.data);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ ok: true, text: res.message ?? "Contraseña actualizada." });
    });
  }

  function onRevoke() {
    if (!window.confirm("¿Cerrar la sesión en todos los demás dispositivos? Esta sesión sigue abierta.")) return;
    startRevoke(async () => {
      const res = await revokeSessions();
      if (res.ok) setView(res.data);
      setRevokeMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Sesiones cerradas.") : res.error });
    });
  }

  const changedAt = view.passwordChangedAt
    ? new Date(view.passwordChangedAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="max-w-[640px]">
      <FormSection n="01" title="Contraseña">
        <p className="m-0 mb-8 text-small text-ink-2" data-testid="password-origin">
          {view.stored
            ? `Cambiada desde el panel${changedAt ? ` el ${changedAt}` : ""}. Se guarda con hash; la del entorno (ADMIN_PASSWORD) ya no aplica.`
            : "Hoy rige la contraseña inicial del entorno (ADMIN_PASSWORD). Al cambiarla aquí queda guardada con hash en la base."}
        </p>
        <form onSubmit={onSubmit} noValidate className="grid gap-6">
          <TextInput
            label="Contraseña actual"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={errors.current}
            autoComplete="current-password"
            required
          />
          <TextInput
            label="Contraseña nueva"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={errors.next}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres. Mejor una frase larga que una palabra con símbolos.`}
            required
          />
          <TextInput
            label="Repite la contraseña nueva"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Button type="submit" disabled={pending || !current || !next || !confirm}>
              {pending ? "Guardando…" : "Cambiar contraseña"}
            </Button>
            <Status message={message} />
          </div>
        </form>
      </FormSection>

      <FormSection n="02" title="Sesiones">
        <p className="m-0 mb-8 text-small text-ink-2">
          Cada sesión dura 7 días. Si entraste desde un equipo ajeno o perdiste un dispositivo, ciérralas todas: esta sigue abierta. Cambiar la contraseña también las cierra.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Button type="button" variant="secondary" onClick={onRevoke} disabled={revoking} data-testid="revoke-sessions">
            {revoking ? "Cerrando…" : "Cerrar las demás sesiones"}
          </Button>
          <Status message={revokeMessage} />
        </div>
      </FormSection>
    </div>
  );
}

function Status({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p role="status" className={cn("m-0 text-label-sm uppercase", message.ok ? "text-ink" : "text-accent")}>
      {message.text}
    </p>
  );
}
