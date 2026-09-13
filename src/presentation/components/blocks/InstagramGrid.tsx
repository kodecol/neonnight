import Image from "next/image";
import type { SiteContent } from "@/application/dto/site-content.dto";

export function InstagramGrid({ content }: { content: SiteContent["social"]["instagram"] }) {
  return (
    <section className="px-page pb-section" data-reveal="1" aria-labelledby="ig-title">
      <div className="flex items-end justify-between border-b border-divider pb-7">
        <h2 id="ig-title" className="m-0 text-[28px] font-medium uppercase leading-[30px]">
          {content.handle}
        </h2>
        <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-label uppercase text-ink-2 hover:text-ink">
          {content.followLabel}
        </a>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="instagram-grid">
        {content.posts.map((post) => (
          <a key={post.src} href={post.href} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden bg-surface" aria-label={post.alt}>
            <Image
              src={post.src}
              alt={post.alt}
              fill
              sizes="(min-width:1024px) 22vw, (min-width:768px) 22vw, 45vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-reveal)] group-hover:scale-[1.04]"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
