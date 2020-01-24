# async-queue

nodejs async queue shenanigans

## example

```javascript
const AsyncQueue = require('async-queue');

async function main() {
  // Construct a new queue
  const queue = new AsyncQueue();

  // Configure the maximum number of concurrent calls
  queue.concurrency = 5;

  // Enqueue a call
  const promise1 = queue.run(myFunction, arg1, arg2);

  // Optionally pause the queue
  queue.pause();

  // Enqueue another call
  const promise2 = queue.run(myOtherFunction, arg1, arg2, arg3);

  // Optionally resume the queue
  queue.resume();

  // wait for both calls to complete
  const results = await Promise.all([promise1, promise2]);

  // or, wait for either one
  const result1 = await promise1;
  const result2 = await promise2;
}

main().catch(console.error);
```
