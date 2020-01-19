/**
 * @typedef Task
 * @property {function} func
 * @property {any} args
 * @property {function} resolve
 * @property {function} reject
 */

/**
 * A simple queue implementation
 */
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
   * Enqueue a task. If the queue is busy, the task may not start running right away.
   * @param {function} func A function to run
   * @param  {...any} args Parameters to func
   * @returns {Promise} Settles when the task completes to the func return value
   */
  run(func, ...args) {
    const task = { func, args, resolve: null, reject: null };
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

  /**
   * @returns {boolean} Whether the queue is running at max concurrency
   */
  isSaturated() {
    console.assert(this.runningTaskCount <= this.concurrency,
      'concurrency limit exceeded');
    return this.runningTaskCount === this.concurrency;
  }

  /**
   * Configure the queue to stop running new tasks. Does not abort running tasks.
   */
  pause() {
    this.paused = true;
    clearTimeout(this.timer);
  }

  /**
   * Reenable the queue to run tasks. Begins running pending tasks.
   * @param {boolean} [immediately] whether to begin running pending tasks in this
   * epoch or in the next
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
    queue.timer = setTimeout(drain.bind(null, queue), delay);
  }
}

/**
 * Run tasks in the queue until it is empty
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

module.exports = AsyncQueue;
