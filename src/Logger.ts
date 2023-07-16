class Logger {
  readonly calls = {
    database: 0,
    rpc: 0,
  };

  #db: Report = {};
  #rpc: Report = {};
  #total = 0;

  get database() {
    const result: Result = {};
    for (const id in this.#db) {
      result[id] = (this.#db[id] / 1000).toFixed(3);
    }
    return result;
  }

  get dbTime() {
    let time = 0;
    for (const id in this.#db) {
      time += this.#db[id];
    }
    return time / 1000;
  }

  get rpc() {
    const result: Result = {};
    for (const id in this.#rpc) {
      result[id] = (this.#rpc[id] / 1000).toFixed(3);
    }
    return result;
  }

  get rpcTime() {
    let time = 0;
    for (const id in this.#rpc) {
      time += this.#rpc[id];
    }
    return time / 1000;
  }

  get total() {
    return this.#total / 1000;
  }

  start() {
    this.reset();
    this.#total = performance.now();
  }

  stop() {
    this.#total = performance.now() - this.#total;
  }

  reset() {
    this.#db = {};
    this.#rpc = {};
    this.#total = 0;
    this.calls.database = 0;
    this.calls.rpc = 0;
  }

  addDatabase(id: string, time: number) {
    if (this.#db[id] === undefined) {
      this.#db[id] = 0;
    }
    this.#db[id] += time;
    this.calls.database += 1;
  }

  addRpc(id: string, time: number) {
    if (this.#rpc[id] === undefined) {
      this.#rpc[id] = 0;
    }
    this.#rpc[id] += time;
    this.calls.rpc += 1;
  }
}

export const logger = new Logger();

type Report = { [id: string]: number };

type Result = { [id: string]: string };
