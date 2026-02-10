// Helper module for worker
export interface WorkerMessage {
  type: string;
  payload: unknown;
}

export function processMessage(msg: WorkerMessage): string {
  return `Processed: ${msg.type}`;
}
