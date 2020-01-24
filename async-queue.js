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
   * Enqueue a function call. This immediately places the call in
   * the queue and immediately returns a promise that will
   * eventually resolve once the call completes.
   *
   * @template T the type of the return value of func
   *
   * @param {function} func A function to call
   * @param  {...any} args Parameters to function when it is called
   * @returns {Promise<T>} Settles when the function call completes
   * and either resolves to the function's return value or rejects
   * with an error.
   */
  run(func, ...args) {
    /** @type {Task<T>} */
    const task = new Task(func, ...args);

    listAppend(this, task);

    if (!this.paused && !this.isSaturated()) {
      clearTimeout(this.timer);
      reschedule(this, 0);
    }

    return task.promise;
  }

  /** Whether the queue is running at max concurrency */
  isSaturated() {
    console.assert(this.runningTaskCount <= this.concurrency,
      'concurrency limit exceeded');
    return this.runningTaskCount >= this.concurrency;
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
 * @typedef ListNode
 * @property {ListNode} next
 *
 * @param {{ head: ListNode, tail: ListNode }} list
 * @param {{ next: ListNode }} node
 */
function listAppend(list, node) {
  if (list.tail) {
    // The list is not empty, so we point the last node to the given node
    list.tail.next = node;
  } else {
    // The list is empty, so we create a new head
    list.head = node;
  }

  // Point the tail to the given node
  list.tail = node;
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

  // we know queue.head is defined
  queue.head = queue.head.next;

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

  if (!this.paused && (queue.runningTaskCount - queue.length)) {
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
