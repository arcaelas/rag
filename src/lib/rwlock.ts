/**
 * Async Mutex para control de concurrencia en Node.js.
 * Serializa operaciones async que modifican estado compartido.
 * Previene interleaving de escrituras en Vectra y el document registry.
 *
 * NO es reentrant — no adquirir desde dentro de un callback locked.
 */
export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      this.queue.shift()!();
    } else {
      this.locked = false;
    }
  }
}
