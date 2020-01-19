class AsyncQueue {
  constructor() {
    /** @type {Array<Task>} */
    this.tasks = [];
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
    const task = new Task();
    task.func = func;
    task.args = args;

    const promise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    this.tasks.push(task);

    if (!this.isSaturated()) {
      clearTimeout(this.timer);
      reschedule(this, 0);
    }

    return promise;
  }

  /** @returns {boolean} Whether the queue is running at max concurrency */
  isSaturated() {
    console.assert(this.runningTaskCount <= this.concurrency,
      'concurrency limit exceeded');
    return this.runningTaskCount === this.concurrency;
  }

  /** Prohibit the queue from starting new tasks */
  pause() {
    this.paused = true;
    clearTimeout(this.timer);
  }

  /**
   * Allow the queue to start new tasks
   * @param {boolean} [immediately] whether to run in this tick or the next
   */
  resume(immediately = true) {
    this.paused = false;
    if (immediately) {
      drain(this).catch(console.warn);
    } else {
      reschedule(this, 0);
    }
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

  if (!queue.tasks.length) {
    return;
  }

  if (queue.isSaturated()) {
    reschedule(queue, queue.busyDelay);
    return;
  }

  const task = queue.tasks.shift();
  console.assert(!!task, 'non-empty queue shift did not produce task');

  queue.runningTaskCount++;

  try {
    const result = await task.func(...task.args);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  } finally {
    queue.runningTaskCount--;
  }

  if (queue.runningTaskCount - queue.tasks.length) {
    reschedule(queue, 0);
  }
}

class Task {
  constructor() {
    /** @type {function} */
    this.func = undefined;
    /** @type {any} */
    this.args = undefined;
    /** @type {function} */
    this.resolve = undefined;
    /** @type {function} */
    this.reject = undefined;
  }
}

module.exports = AsyncQueue;
