export interface QueuedOperation {
  id: string;
  type: string;
  context: string;
  execute: () => Promise<void>;
}

class OperationQueueService {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;
  private listeners: Set<() => void> = new Set();

  async enqueue(operation: QueuedOperation): Promise<void> {
    this.queue.push(operation);

    console.log(
      `Operation queued: ${operation.type} in ${operation.context} (ID: ${operation.id})`
    );
    console.log(`Queue size: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyListeners();

    try {
      while (this.queue.length > 0) {
        const operation = this.queue[0];
        console.log(
          `Processing operation: ${operation.type} in ${operation.context} (ID: ${operation.id})`
        );

        try {
          await operation.execute();
          console.log(
            `Operation completed: ${operation.type} in ${operation.context} (ID: ${operation.id})`
          );
        } catch (error: any) {
          if (error.message?.includes("Could not acquire sync lock")) {
            console.log(
              `Operation retry scheduled: ${operation.type} in ${operation.context} (ID: ${operation.id})`
            );

            await new Promise((resolve) => setTimeout(resolve, 500));

            const failedOp = this.queue.shift();
            if (failedOp) {
              this.queue.push(failedOp);
            }
            continue;
          } else {
            console.error(
              `Operation failed: ${operation.type} in ${operation.context} (ID: ${operation.id}):`,
              error
            );
          }
        } finally {
          if (this.queue[0]?.id === operation.id) {
            this.queue.shift();
          }
          this.notifyListeners();
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  getStatus() {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing,
      operations: this.queue.map((op) => ({
        id: op.id,
        type: op.type,
        context: op.context,
      })),
    };
  }
}

export const OperationQueue = new OperationQueueService();
