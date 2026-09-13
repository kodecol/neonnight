import type { Clock, IdGenerator } from "@/application/ports/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class RandomIdGenerator implements IdGenerator {
  constructor(private readonly prefix = "nn") {}
  next(): string {
    return `${this.prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
}
