const AsyncQueue = require('.');

async function main() {
  const queue = new AsyncQueue();
  queue.concurrency = 2;
  queue.busyDelay = 1000;

  let taskCounter = 0;

  /** @returns {Promise<number>} */
  async function testTask(duration) {
    const id = taskCounter++;
    console.log('start task id %s duration %d', id, duration);
    await new Promise(resolve => setTimeout(resolve, duration));
    console.log('end task id %s duration %d', id, duration);
    return duration;
  }

  const promises = [];
  for (let i = 0; i < 5; i++) {
    const promise = queue.run(testTask, i * 1000);
    promises.push(promise);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
  promises.push(queue.run(testTask, 5000));
  const durations = await Promise.all(promises);
  console.log('All tasks completed');
  for (const duration of durations) {
    console.log('Task duration:', duration);
  }
}

main().catch(console.error);
