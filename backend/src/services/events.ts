import { EventEmitter } from "node:events";

export interface TxStatusEvent {
  txId: string;
  status: string;
  subStatus?: string;
  assetId?: string;
  amount?: string;
  at: string;
}

// In-memory bus: webhook handler publishes, SSE route subscribes.
// (A real deployment would back this with Redis/pubsub for multi-instance.)
class TxEventBus extends EventEmitter {
  private latest = new Map<string, TxStatusEvent>();

  publish(event: TxStatusEvent) {
    this.latest.set(event.txId, event);
    this.emit("tx", event);
  }

  snapshot(): TxStatusEvent[] {
    return [...this.latest.values()];
  }
}

export const txEvents = new TxEventBus();
