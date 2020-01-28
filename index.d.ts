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

  /** Enqueue a function to eventually run */
  run(func: (...args: any[]) => any, ...args: any[]): Promise<ReturnType<func>>;

  /**
   * Stop polling the queue. Currently running tasks continue but tasks
   * waiting to start will no longer start.
   */
  pause(): void;

  /** Start polling the queue */
  resume(): void;
}

declare namespace AsyncQueue {

  export interface ListNode {
    next: ListNode
  }

  export interface List {
    head: ListNode
    tail: ListNode
    length: number
  }

  export class Task implements ListNode {
    func: (...args: any[]) => any;
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
    next?: ListNode
  }
}

export = AsyncQueue;
