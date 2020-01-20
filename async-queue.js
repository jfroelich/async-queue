class AsyncQueue {
  constructor() {
    this.head = undefined;
    this.tail = undefined;

    this.runningTaskCount = 0;
    this.concurrency = 1;
    this.timer = null;
    this.paused = false;
    this.busyDelay = 0;
  }

  /**
   * Enqueue a task
   *
   * @template T the type of the return value of func
   *
   * @param {function} func A function to run
   * @param  {...any} args Parameters to func
   * @returns {Promise<T>} Settles when the task completes
   */
  run(func, ...args) {
    /** @type {Task<T>} */
    const task = new Task(func, ...args);

    if (this.tail) {
      this.tail.next = task;
    } else {
      this.head = task;
    }

    // In both cases the added task is the new tail
    this.tail = task;

    if (!this.isSaturated()) {
      clearTimeout(this.timer);
      reschedule(this, 0);
    }

    return task.promise;
  }

  /** Whether the queue is running at max concurrency */
  isSaturated() {
    console.assert(this.runningTaskCount <= this.concurrency,
      'concurrency limit exceeded');
    return this.runningTaskCount === this.concurrency;
  }

  pause() {
    this.paused = true;
    clearTimeout(this.timer);
  }

  /** @param {boolean} [immediately] whether to run in this tick or the next */
  resume(immediately = true) {
    this.paused = false;
    if (immediately) {
      drain(this).catch(console.warn);
    } else {
      reschedule(this, 0);
    }
  }

  get length() {
    let length = 0;
    for (let node = this.head; node; node = node.next, length++);
    return length;
  }
}

/**
 * @param {AsyncQueue} queue
 * @param {number} delay ms
 */
function reschedule(queue, delay) {
  if (!queue.paused) {
    queue.timer = setTimeout(drain, delay, queue);
  }
}

/**
 * @param {AsyncQueue} queue
 * @returns {Promise<void>}
 */
async function drain(queue) {
  if (queue.paused) {
    return;
  }

  if (queue.isSaturated()) {
    reschedule(queue, queue.busyDelay);
    return;
  }

  const task = queue.head;
  if (!task) {
    return;
  }

  queue.head = queue.head ? queue.head.next : undefined;
  queue.tail = queue.head ? queue.tail : undefined;
  task.next = undefined;

  queue.runningTaskCount++;

  try {
    const result = await task.func(...task.args);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  } finally {
    queue.runningTaskCount--;
  }

  if (queue.runningTaskCount - queue.length) {
    reschedule(queue, 0);
  }
}

/**
 * @template T type of value from promise resolve
 */
class Task {
  /**
   * @param {function} [func]
   * @param {...any} args
   */
  constructor(func, ...args) {
    this.func = func;
    this.args = args;

    /** @type {Promise<T>} */
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.next = undefined;
  }
}

module.exports = AsyncQueue;
