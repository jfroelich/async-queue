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
    list.tail.next = node;
  } else {
    list.head = node;
  }

  list.tail = node;
}

/**
 * Remove the first node from the list and return it
 * Returns undefined if the list is empty
 * @param {object} list
 */
function listPop(list) {
  const node = list.head;
  if (node) {
    list.head = node.next;
    list.tail = list.head ? list.tail : undefined;
    node.next = undefined;
  }
  return node;
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
  // If we are draining right now, we assume responsibility for
  // rescheduling ourselves, and want to cancel any kind of
  // other enqueued request to drain. This is harmless if that
  // is not the case.
  clearTimeout(queue.timer);

  // There are 3 main reasons to not drain, only one of which
  // involves rescheduling ourself to run again:
  // 1) we were instructed to do nothing (paused), and
  //    we should not reschedule because we will explicitly
  //    be told later (via resume) to try again
  // 2) we are too busy right now, we should reschedule
  //    because we can safely conclude trying again is worthwhile
  // 3) there is nothing to do (and so we should also not
  //    reschedule because schedule is done on add to avoid empty
  //    poll)

  if (queue.paused) {
    return;
  }

  if (queue.isSaturated()) {
    reschedule(queue, queue.busyDelay);
    return;
  }

  const task = listPop(queue);
  if (!task) {
    return;
  }

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
