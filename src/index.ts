interface ConstructorOptions {
  /** Whether the queue should init to a paused state */
  paused: boolean;
  /** The amount of milliseconds to wait when retrying when busy */
  delay: number;
  /** The maximum number of concurrently executing functions */
  concurrency: number;
}

/** Any function, including async or promise returning functions */
type RunnableFunction = (...args: any[]) => any;

/**
 * A simple promise-based asynchronous queue. Useful for tasks
 * such as queuing up HTTP requests against a rate-limited REST
 * API.
 *
 * @example
 *   const queue = new AsyncQueue({ paused: true });
 *   await queue.run(myFunction, arg1, arg2);
 *   queue.resume();
 */
export default class AsyncQueue {
  /** Whether the queue is currently paused */
  paused: boolean;
  /** The first item in the queue */
  _head?: Task;
  /** The last item in the queue */
  _tail?: Task;
  /** A count of currently running tasks */
  _run_count: number;
  /** The maximum number of concurrently executing functions */
  concurrency: number;
  /** The amount of milliseconds to wait when retrying when busy */
  delay: number;
  /** Handle to a setTimeout timer */
  tid: NodeJS.Timeout;
  /** Handle to a setImmediate timer */
  iid: NodeJS.Immediate;
  /** poll function bound to current instance */
  _poll_bound: any;

  constructor(options: Partial<ConstructorOptions> = {}) {
    const { paused = false, delay = 0, concurrency = 1 } = options;
    this._head;
    this._tail;
    this._run_count = 0;
    this.concurrency = concurrency;
    this.tid;
    this.iid;
    this._poll_bound = this._poll.bind(this);

    this.paused = paused;
    this.delay = delay;
  }

  run(func: RunnableFunction, ...args: any[]) {
    const task = new Task(func, ...args);
    this._append(task);
    this._reschedule();
    return task.promise;
  }

  /**
   * Ask the queue to not immediately start running tasks
   * when enqueued
   */
  pause() {
    this.paused = true;
    clearImmediate(this.iid);
    clearTimeout(this.tid);
  }

  /** Ask the queue to start running any pending tasks */
  resume() {
    this.paused = false;
    this._reschedule();
  }

  /** Returns the number of items in the queue */
  get length() {
    let length = 0;
    let node = this._head;
    while (node) {
      node = node.next;
      length++;
    }
    return length;
  }

  _append(node: Task): void {
    if (this._tail) {
      this._tail.next = node;
    } else {
      this._head = node;
    }

    this._tail = node;
  }

  _pop(): Task | undefined {
    const node = this._head;
    if (node) {
      this._head = node.next;
      this._tail = this._head ? this._tail : undefined;
      node.next = undefined;
    }
    return node;
  }

  _reschedule(delay = 0) {
    if (this.paused) {
      // noop
    } else if (!this._head) {
      console.warn('empty reschedule not honored');
      // noop
    } else if (delay > 0) {
      this.tid = setTimeout(this._poll_bound, delay);
    } else {
      this.iid = setImmediate(this._poll_bound);
    }
  }

  async _poll() {
    if (this._run_count >= this.concurrency) {
      this._reschedule(this.delay);
      return;
    }

    const task = this._pop();
    if (!task) {
      return;
    }

    this._run_count++;
    try {
      const result = await task.func(...task.args);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this._run_count--;
    }
  }
}

class Task {
  func: RunnableFunction;
  args: any[];
  promise: Promise<ReturnType<RunnableFunction>>;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  next?: Task;

  constructor(func: RunnableFunction, ...args: any[]) {
    this.resolve = () => { };
    this.reject = () => { };
    this.next;

    this.func = func;
    this.args = args;

    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
