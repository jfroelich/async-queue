import AsyncQueue from '.';
import assert from 'assert';

async function main() {
  const queue = new AsyncQueue({
    concurrency: 2,
    delay: 200
  });

  let taskCounter = 0;

  async function testTask(duration: number) {
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

  // Schedule a task after a some delay. This can expose subtle
  // bad behavior in reschedule logic.
  await new Promise(resolve => setTimeout(resolve, 1000));
  promises.push(queue.run(testTask, 5000));

  const durations = await Promise.all(promises);

  assert(durations.length === 6);

  console.log('All tasks completed');

  for (const duration of durations) {
    console.log('Task duration:', duration);
  }
}

main().catch(console.error);
