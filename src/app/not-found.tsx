import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { ROUTES } from "@/presentation/lib/site";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-page pt-header">
      <Kicker>404</Kicker>
      <h1 className="mb-4 mt-4 text-display-fluid uppercase">Pieza no encontrada</h1>
      <p className="m-0 max-w-[48ch] text-lead text-ink-2">Esta referencia no existe o ya no está en la colección.</p>
      <div className="mt-9">
        <Button href={ROUTES.collection}>Ver la colección</Button>
      </div>
    </main>
  );
}
