class AsyncQueue {
  constructor() {
    this._head;
    this._tail;
    this._run_count = 0;
    this.concurrency = 1;
    this.tid = null;
    this.iid = null;
    this.paused = false;
    this.delay = 0;
    this._poll_bound = this._poll.bind(this);
  }

  run(func, ...args) {
    const task = new Task(func, ...args);
    this._append(task);
    this._reschedule();
    return task.promise;
  }

  pause() {
    this.paused = true;
    clearImmediate(this.iid);
    clearTimeout(this.tid);
  }

  resume() {
    this.paused = false;
    this._reschedule();
  }

  get length() {
    let length = 0;
    let node = this._head;
    while (node) {
      node = node.next;
      length++;
    }
    return length;
  }

  _append(node) {
    if (this._tail) {
      this._tail.next = node;
    } else {
      this._head = node;
    }

    this._tail = node;
  }

  _pop() {
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
