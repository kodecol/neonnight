export function Description({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <section id="detalles" className="grid grid-cols-1 gap-10 border-b border-divider px-page py-section md:grid-cols-2 md:gap-20" data-reveal="1">
      <h2 className="m-0 text-h2-fluid uppercase">{title}</h2>
      <div className="flex flex-col gap-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="m-0 text-lead text-ink-2 [text-wrap:pretty]">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
