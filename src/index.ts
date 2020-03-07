type AnyFunction = (...args: any[]) => any;

interface Countable {
  length: number;
}

interface Discontinuous {
  readonly pause: AnyFunction;
  readonly resume: AnyFunction;
}

interface List<T> {
  head: T;
  tail: T;
  readonly append: AnyFunction;
}

interface ListItem {
  /** Reference to next item in list */
  next?: ListItem;
}

interface Queue<T> extends List<T>, Countable {
  readonly pop: AnyFunction;
}

interface ConstructorOptions {
  /** Whether the queue should init to a paused state */
  paused: boolean;
  /** The amount of milliseconds to wait when retrying when busy */
  delay: number;
  /** The maximum number of concurrently executing functions */
  concurrency: number;
}

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
export default class AsyncQueue implements Discontinuous, Queue<Task> {
  /** The maximum number of concurrently executing functions */
  public concurrency: number;
  /** The amount of milliseconds to wait when retrying when busy */
  public delay: number;

  public head: Task;
  public tail: Task;

  /** Whether the queue is currently paused */
  private paused: boolean;

  /** A count of currently running tasks */
  private run_count: number;

  /** Handle to a setTimeout timer */
  private tid: NodeJS.Timeout;
  /** Handle to a setImmediate timer */
  private iid: NodeJS.Immediate;
  /** poll function bound to current instance */
  private readonly poll_bound: AnyFunction;

  constructor(readonly options: Partial<ConstructorOptions> = {}) {
    const { paused = false, delay = 0, concurrency = 1 } = options;
    this.head;
    this.tail;
    this.run_count = 0;
    this.concurrency = concurrency;
    this.tid;
    this.iid;
    this.poll_bound = this.poll.bind(this);

    this.paused = paused;
    this.delay = delay;
  }

  public run(func: AnyFunction, ...args: any[]) {
    const task = new Task(func, ...args);
    this.append(task);
    this.reschedule();
    return task.promise;
  }

  public pause() {
    this.paused = true;
    clearImmediate(this.iid);
    clearTimeout(this.tid);
  }

  public resume() {
    this.paused = false;
    this.reschedule();
  }

  public get length() {
    let length = 0;
    let node = this.head;
    while (node) {
      node = node.next;
      length++;
    }
    return length;
  }

  public append(node: Task) {
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }

    this.tail = node;
  }

  public pop(): Task {
    const node = this.head;
    if (node) {
      this.head = node.next;
      this.tail = this.head ? this.tail : void this.tail;
      node.next = void node.next;
    }
    return node;
  }

  /**
   * @param delay milliseconds to wait before polling
   */
  private reschedule(delay = 0) {
    if (this.paused) {
      // noop
    } else if (!this.head) {
      // noop
    } else if (delay > 0) {
      this.tid = setTimeout(this.poll_bound, delay);
    } else {
      this.iid = setImmediate(this.poll_bound);
    }
  }

  private async poll() {
    if (this.run_count >= this.concurrency) {
      this.reschedule(this.delay);
      return;
    }

    const task = this.pop();
    if (!task) {
      return;
    }

    this.run_count++;
    try {
      const result = await task.func(...task.args);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.run_count--;
    }
  }
}

class Task implements ListItem {
  public func: AnyFunction;
  public args: any[];
  public promise: Promise<any>;
  public resolve: (value?: any) => void;
  public reject: (reason?: any) => void;
  public next: Task;

  constructor(func: AnyFunction, ...args: any[]) {
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
