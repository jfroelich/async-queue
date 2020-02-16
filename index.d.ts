declare class AsyncQueue {
  /** The maximum number of concurrent tasks permitted */
  concurrency: number;

  /**
   * Number of milliseconds to wait during rescheduling when
   * the queue is saturated
   */
  busyDelay: number;

  length: number;

  /** Enqueue a function to eventually run */
  run(func: (...args: any[]) => any, ...args: any[]): Promise<ReturnType<func>>;

  /** Stop polling the queue */
  pause(): void;

  /** Resume polling the queue */
  resume(): void;
}

export = AsyncQueue;
