import type { WatchId } from "./watch";

export interface CartLine {
  readonly watchId: WatchId;
  readonly quantity: number;
}
