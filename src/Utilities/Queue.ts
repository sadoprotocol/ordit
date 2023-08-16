export class Queue<T> {
  status: Status;

  #queue: Message<T>[];
  #handle: Handler<T>;

  constructor(handler: Handler<T>) {
    this.status = "idle";
    this.#queue = [];
    this.#handle = handler;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  is(status: Status): boolean {
    return this.status === status;
  }

  push(message: T, resolve: MessagePromise["resolve"], reject: MessagePromise["reject"]): this {
    this.#queue.push({ message, resolve, reject });
    this.#process();
    return this;
  }

  flush(filter?: Filter<Message<T>>): this {
    if (filter) {
      this.#queue = this.#queue.filter(filter);
    } else {
      this.#queue = [];
    }
    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Processor
   |--------------------------------------------------------------------------------
   */

  async #process(): Promise<this> {
    if (this.is("working")) {
      return this;
    }

    this.#setStatus("working");

    const job = this.#queue.shift();
    if (!job) {
      return this.#setStatus("drained");
    }

    this.#handle(job.message)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        this.#setStatus("idle").#process();
      });

    return this;
  }

  #setStatus(value: Status): this {
    this.status = value;
    return this;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Status = "idle" | "working" | "drained";

type Handler<T> = (message: T) => Promise<any> | Promise<any[]>;

type Message<T> = {
  message: T;
} & MessagePromise;

type MessagePromise = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

type Filter<T> = (job: T) => boolean;
