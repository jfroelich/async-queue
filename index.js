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
  }

  run(func, ...args) {
    const task = new Task(func, ...args);
    listAppend(this, task);
    reschedule(this, 0);
    return task.promise;
  }

  pause() {
    this.paused = true;

    clearImmediate(this.immediateId);
    clearTimeout(this.timeoutId);
  }

  resume() {
    this.paused = false;
    reschedule(this, 0);
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
  if (queue.paused) {
    // noop
  } else if (delay) {
    queue.timeoutId = setTimeout(poll, delay, queue);
  } else {
    queue.immediateId = setImmediate(poll, queue);
  }
}

async function poll(queue) {
  if (queue.paused) {
    return;
  }

  if (queue.runningTaskCount >= queue.concurrency) {
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

  if (queue.runningTaskCount - queue.length) {
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
