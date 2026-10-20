import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";
import { GetHomeSettings, ListSiteMedia } from "@/application/use-cases/admin/home";
import { GetFeaturedProduct } from "@/application/use-cases/get-featured-product";
import { ListLines } from "@/application/use-cases/list-lines";
import { AdminPageHeader } from "@/presentation/components/admin/AdminShell";
import { HomeEditor } from "@/presentation/components/admin/HomeEditor";
import { Button } from "@/presentation/components/primitives/Button";
import { ROUTES } from "@/presentation/lib/site";
import {
  deleteSiteMediaAction,
  registerSiteVideoAction,
  requestVideoUploadAction,
  saveHomeSettingsAction,
  updateSiteMediaAltAction,
  uploadSiteImageAction,
} from "./actions";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function HomeAdminPage() {
  const c = getContainer();
  const [settings, media, featured, lines, site] = await Promise.all([
    new GetHomeSettings(c.homeSettings).execute(),
    new ListSiteMedia(c).execute(),
    new GetFeaturedProduct(c.products).execute(),
    new ListLines(c).execute(),
    c.content.get(),
  ]);
  // Destinos sugeridos para el botón del hero.
  const links = [
    { href: ROUTES.collection, label: "Toda la colección" },
    ...lines.map((l) => ({ href: ROUTES.line(l.slug), label: l.label })),
    { href: "/nosotros", label: "Nosotros" },
  ];
  return (
    <>
      <AdminPageHeader
        kicker="Contenido"
        title="Inicio"
        actions={
          <Button href="/" variant="ghost" size="sm" target="_blank" rel="noreferrer">
            Ver la home ↗
          </Button>
        }
      />
      <HomeEditor
        initial={settings}
        media={media}
        featured={featured ? { name: featured.name, href: ROUTES.product(featured.kind, featured.slug), editHref: `/admin/catalogo/${featured.id}` } : null}
        defaults={{ bandTitle: site.home.band.title, bandImage: site.home.band.image.src, heroCta: site.home.hero.primaryCta }}
        links={links}
        videosEnabled={c.videoSigner.enabled}
        actions={{
          save: saveHomeSettingsAction,
          uploadImage: uploadSiteImageAction,
          requestVideo: requestVideoUploadAction,
          registerVideo: registerSiteVideoAction,
          updateAlt: updateSiteMediaAltAction,
          remove: deleteSiteMediaAction,
        }}
      />
    </>
  );
}
