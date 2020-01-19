// import AsyncQueue from './async-queue';
const AsyncQueue = require('./async-queue');

let taskCounter = 0;

async function main() {
  const queue = new AsyncQueue();
  queue.concurrency = 2;
  queue.busyDelay = 1000;

  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(queue.run(testTask, i * 1000));
  }

  // delayed enqueue
  await new Promise(resolve => setTimeout(resolve, 1000));
  promises.push(queue.run(testTask, 5000));

  // wait for all tasks to resolve
  await Promise.all(promises);

  console.log('All tasks completed');
}

async function testTask(duration) {
  const id = taskCounter;
  taskCounter++;
  console.log('Starting test task with id', id);
  await new Promise(resolve => setTimeout(resolve, duration));
  console.log('Ending test task with id', id);
  return duration;
}

main().catch(console.error);
