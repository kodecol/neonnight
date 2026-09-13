export function InstagramGrid({ instagramUrl }: { instagramUrl: string }) {
  return (
    <section className="px-page pb-section" data-reveal="1" aria-labelledby="ig-title">
      <div className="flex items-end justify-between border-b border-divider pb-7">
        <h2 id="ig-title" className="m-0 text-[28px] font-medium uppercase leading-[30px]">
          @neonnight
        </h2>
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-label uppercase text-ink-2 hover:text-ink">
          Seguir en Instagram
        </a>
      </div>
      {/* PENDIENTE (handoff §7): posts reales del perfil */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-surface" role="img" aria-label={`Post de Instagram ${i} (pendiente)`} />
        ))}
      </div>
    </section>
  );
}
