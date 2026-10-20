import type { SocialNetworkId } from "@/application/dto/site-content.dto";

/** Glifos monolínea de las redes, a juego con el trazo fino del sistema. */
export function SocialIcon({ id, className }: { id: SocialNetworkId; className?: string }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className } as const;
  switch (id) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.4 6.6h.01" strokeWidth="2" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M17 2.5h-2.8A4.7 4.7 0 0 0 9.5 7.2V10H7v3.8h2.5v7.7h3.8v-7.7h2.9l.8-3.8h-3.7V7.6c0-.6.5-1.1 1.1-1.1H17z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M14 3v11.6a3.6 3.6 0 1 1-3.6-3.6" />
          <path d="M14 3c.5 2.8 2.4 4.7 5.2 5" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8A27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8z" />
          <path d="M10 9.3v5.4l4.7-2.7z" />
        </svg>
      );
  }
}
