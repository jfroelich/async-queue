declare class AsyncQueue implements AsyncQueue.List {
  /**
   * The maximum number of concurrent tasks permitted
   */
  concurrency: number;

  /**
   * Number of milliseconds to wait during rescheduling when
   * the queue is saturated
   */
  busyDelay: number;

  length: number;

  head: AsyncQueue.ListNode;
  tail: AsyncQueue.ListNode;

  /**
   * Enqueue a function to eventually run. Returns a promise that
   * resolves when the called function completes or rejects when the
   * called function throws an error.
   */
  run<OutputType>(
    func: (...arg0: any[]) => OutputType | Promise<OutputType>,
    ...args: any[]
  ): Promise<OutputType>;

  /**
   * Returns whether the queue is currently at max concurrency
   */
  isSaturated(): boolean;

  /**
   * Pauses the queue. Does not abort currently running tasks.
   * If the queue is scheduled to drain itself, that drain is canceled.
   * Future drain attempts will not deplete the queue nor run tasks.
   */
  pause(): void;

  /**
   * Unpauses the queue
   * @param immediately in this tick if true, otherwise in later tick
   */
  resume(immediately?: boolean): void;
}

declare namespace AsyncQueue {
  interface ListNode {
    next: ListNode
  }

  interface List {
    head: ListNode
    tail: ListNode
  }

  class Task implements ListNode {
    func: any;
    resolve: any;
    reject: any;
    next: ListNode
  }
}

export = AsyncQueue;
