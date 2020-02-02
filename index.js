class AsyncQueue {
  constructor() {
    this.head = undefined;
    this.tail = undefined;

    this.runningTaskCount = 0;
    this.concurrency = 1;

    this.timeoutId = null;
    this.immediateId = null;

    this.paused = false;
    this.busyDelay = 0;

    this._pollBound = this._poll.bind(this);
  }

  run(func, ...args) {
    const task = new Task(func, ...args);
    this._append(task);
    this._reschedule();
    return task.promise;
  }

  pause() {
    this.paused = true;

    clearImmediate(this.immediateId);
    clearTimeout(this.timeoutId);
  }

  resume() {
    this.paused = false;
    this._reschedule();
  }

  get length() {
    let length = 0;
    let node = this.head;
    while (node) {
      node = node.next;
      length++;
    }
    return length;
  }

  _append(node) {
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }

    this.tail = node;
  }

  _pop() {
    const node = this.head;
    if (node) {
      this.head = node.next;
      this.tail = this.head ? this.tail : undefined;
      node.next = undefined;
    }
    return node;
  }

  _reschedule(delay = 0) {
    if (this.paused) {
      // noop
    } else if (delay > 0) {
      this.timeoutId = setTimeout(this._pollBound, delay);
    } else {
      this.immediateId = setImmediate(this._pollBound);
    }
  }

  async _poll() {
    if (this.paused) {
      return;
    }

    if (this.runningTaskCount >= this.concurrency) {
      this._reschedule(this.busyDelay);
      return;
    }

    const task = this._pop();
    if (!task) {
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
  }
}

class Task {
  constructor(func, ...args) {
    this.func = func;
    this.args = args;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.next = undefined;
  }
}

module.exports = AsyncQueue;
