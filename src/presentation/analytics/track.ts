import { isGaMeasurementId, isMetaPixelId } from "@/application/lib/tracking-ids";
import { toGa, toMeta, type StoreEvent } from "./events";

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
interface TrackingWindow {
  dataLayer?: unknown[];
  gtag?: Gtag;
  fbq?: Fbq;
  _fbq?: Fbq;
  [key: `ga-disable-${string}`]: boolean | undefined;
}

const w = () => window as unknown as TrackingWindow;

/** Eventos que llegan antes de que las etiquetas estén listas (los efectos hijos corren primero). */
const pending: StoreEvent[] = [];
const MAX_PENDING = 30;

/** Envía el evento a las etiquetas activas; si aún no hay ninguna, lo guarda. */
export function track(event: StoreEvent): void {
  if (typeof window === "undefined") return;
  const { gtag, fbq } = w();
  if (!gtag && !fbq) {
    if (pending.length < MAX_PENDING) pending.push(event);
    return;
  }
  if (gtag) gtag("event", ...toGa(event));
  const meta = toMeta(event);
  if (fbq && meta) {
    const [name, params, eventID] = meta;
    if (eventID) fbq("track", name, params, { eventID });
    else fbq("track", name, params);
  }
}

export function flushPending(): void {
  for (const e of pending.splice(0)) track(e);
}

function injectScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Google Analytics 4 con modo de consentimiento: la publicidad sigue denegada sin permiso de marketing. */
export function loadGa(id: string, marketing: boolean): void {
  if (!isGaMeasurementId(id)) return;
  const win = w();
  win[`ga-disable-${id}`] = false;
  if (!win.gtag) {
    win.dataLayer = win.dataLayer ?? [];
    // gtag.js exige `arguments`, no un array.
    win.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
    const ads = marketing ? "granted" : "denied";
    win.gtag("consent", "default", { analytics_storage: "granted", ad_storage: ads, ad_user_data: ads, ad_personalization: ads });
    win.gtag("js", new Date());
    win.gtag("config", id);
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${id}`);
  } else {
    updateGaConsent(true, marketing);
  }
}

export function updateGaConsent(analytics: boolean, marketing: boolean): void {
  const ads = marketing ? "granted" : "denied";
  w().gtag?.("consent", "update", { analytics_storage: analytics ? "granted" : "denied", ad_storage: ads, ad_user_data: ads, ad_personalization: ads });
}

/** Desactiva GA en caliente y borra sus cookies propias. */
export function disableGa(id: string): void {
  const win = w();
  win[`ga-disable-${id}`] = true;
  updateGaConsent(false, false);
  clearCookies(/^_ga/);
}

/** Píxel de Meta (fragmento oficial, sin `eval`). */
export function loadPixel(id: string): void {
  if (!isMetaPixelId(id)) return;
  const win = w();
  if (win.fbq) {
    win.fbq("consent", "grant");
    return;
  }
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  win.fbq = fbq;
  win._fbq = fbq;
  injectScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", id);
  fbq("track", "PageView");
}

export function disablePixel(): void {
  w().fbq?.("consent", "revoke");
  clearCookies(/^_fbp$|^_fbc$/);
}

export function pixelPageView(): void {
  w().fbq?.("track", "PageView");
}

/** Borra cookies propias por nombre, en el dominio actual y en el padre. */
function clearCookies(pattern: RegExp): void {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name || !pattern.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
  }
}
