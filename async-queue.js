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
      this.reschedule(0);
    }

    return promise;
  }

  /**
   * @returns {boolean} Whether the queue is full and cannot start on any
   * more tasks
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
      this.drain().catch(console.warn);
    } else {
      this.reschedule(0);
    }
  }

  /**
   * Schedule the queue to start running tasks after the given delay. This does nothing
   * if the queue is paused.
   * @param {number} delay
   */
  reschedule(delay) {
    if (this.paused) {
      return null;
    }
    this.timer = setTimeout(this.drain.bind(this), delay);
    return this.timer;
  }

  /**
   * Run tasks in the queue until the queue is empty
   */
  async drain() {
    if (this.paused) {
      return;
    }

    if (!this.tasks.length) {
      return;
    }

    if (this.isSaturated()) {
      this.reschedule(this.busyDelay);
      return;
    }

    const task = this.tasks.shift();
    if (!task) {
      // This is not fatal but we expect to always get a task because
      // we checked tasks.length.
      return;
    }

    this.runningTaskCount++;

    try {
      const result = await task.func(...task.args);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.runningTaskCount--;
    }

    // Once the task completes we know we are not busy, as in, we
    // know we are not saturated, as in, we know that this.concurrency
    // - this.runningTaskCount is > 0. In that case, check if there are
    // tasks in the queue now that we freed up a space and schedule
    // to start the next one asap. We do not call this.drain directly
    // because that could lead to stack overflow.
    if (this.runningTaskCount - this.tasks.length) {
      this.reschedule(0);
    }
  }
}

module.exports = AsyncQueue;
