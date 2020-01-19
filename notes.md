# notes

Every enqueue triggers a dequeue, i think, this way there is no need to poll the queue in a loop or anything like that

Wait, you cannot enqueue a promise because that starts it running immediately
// and that is the entire problem, we do not always want it to start immediately.
// so we need to enqueue a generic thing like a function call and its arguments
// and then enqueue that. so we enqueue a function that will be called instead,
// that means the caller always needs to enqueue a function, if they want a
// function with arguments then they have to wrap. and i think it has to be a
// promise returning function so we can know when it resolves.

// there is still a polling that happens, it happens when we cannot start the
// next task because too many are in flight. in that case it needs to reschedule
// itself to check again. or maybe each dequeue starts running the next task in
// queue so there is no need to poll. we just enqueue at the start, then start
// a dequeue thing? but what about two users dequeing concurrently?

// i can go with the wrap approach for now, the annoyance is that this
// makes the caller use boilerplate so it might be nicer to use function
// pointer and ...args

// ok but how does the caller get notified the function completed?

// Enqueue an awaitable function to eventually run. You will want to
// call this concurrently to queue up multiple promises. Functions are
// executed in the order you enqueue them, but may resolve out of
// order. enqueue resolves when the awaitable resolves, and resolves to
// the result of the awaitable. Note that sync functions are also
// awaitable so you can mix functions together. You should wrap a
// promise function in another promise function to avoid having it
// start executing immediately.

    // The big ideas:
  // * we wrap the promise in a job and capture its resolve/reject
  //   so that when the promise resolves we can notify the caller
  //   in a natural way
  // * Each time we get a new job, we enqueue it. Then since we know
  //   the queue is not empty we run the next job in the queue, which
  //   could be the job just added or some previously enqueued job.
  // * Each time a job completes, we check for and start running the
  //   next job too, and then resolve.

Eventually use something better than an array, unshift/shift etc are not optimal, something like a dynamically linked list (see npm dll.js)

    // TODO: I am not sure i actually need to move items from one array to
    // another. I can just keep track of the count of in-flight things and
    // just keep all jobs in the pending array.
