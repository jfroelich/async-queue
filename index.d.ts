declare class AsyncQueue {
  /** The maximum number of concurrent tasks permitted */
  concurrency: number;

  /** Milliseconds to wait during rescheduling when saturated */
  delay: number;

  /** Number of items in the queue (in flight or pending) */
  length: number;

  /** Enqueue a function to eventually run */
  run(func: (...args: any[]) => Promise<ReturnType<func>>, ...args: any[]): Promise<ReturnType<func>>;

  /** Stop polling the queue */
  pause(): void;

  /** Resume polling the queue */
  resume(): void;
}

export = AsyncQueue;
