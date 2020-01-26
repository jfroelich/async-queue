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

  run(func, ...args) {
    const task = new Task(func, ...args);
    listAppend(this, task);

    if (!this.paused && !this.isSaturated()) {
      clearTimeout(this.timer);
      reschedule(this, 0);
    }

    return task.promise;
  }

  isSaturated() {
    return this.runningTaskCount >= this.concurrency;
  }

  pause() {
    this.paused = true;
    clearTimeout(this.timer);
  }

  resume(immediately = true) {
    this.paused = false;
    if (immediately) {
      poll(this).catch(console.warn);
    } else {
      reschedule(this, 0);
    }
  }

  get length() {
    return listLength(this);
  }
}

function listLength(list) {
  let length = 0;
  let node = list.head;
  while (node) {
    node = node.next;
    length++;
  }
  return length;
}

function listAppend(list, node) {
  if (list.tail) {
    list.tail.next = node;
  } else {
    list.head = node;
  }

  list.tail = node;
}

function listPop(list) {
  const node = list.head;
  if (node) {
    list.head = node.next;
    list.tail = list.head ? list.tail : undefined;
    node.next = undefined;
  }
  return node;
}

function reschedule(queue, delay) {
  if (!queue.paused) {
    queue.timer = setTimeout(poll, delay, queue);
  }
}

async function poll(queue) {
  clearTimeout(queue.timer);
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
