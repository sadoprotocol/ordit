class Logger {
  readonly timers = {
    process: 0,
    database: 0,
    rpc: 0,
  };

  readonly calls = {
    database: 0,
    rpc: 0,
  };

  get database() {
    return (this.timers.database / 1000).toFixed(3);
  }

  get rpc() {
    return (this.timers.rpc / 1000).toFixed(3);
  }

  get process() {
    const db = this.timers.database;
    const rpc = this.timers.rpc;
    const process = this.timers.process;
    return ((process - (db + rpc)) / 1000).toFixed(3);
  }

  get total() {
    return (this.timers.process / 1000).toFixed(3);
  }

  start() {
    this.reset();
    this.timers.process = performance.now();
  }

  stop() {
    this.timers.process = performance.now() - this.timers.process;
  }

  reset() {
    this.timers.database = 0;
    this.timers.process = 0;
    this.timers.rpc = 0;
    this.calls.database = 0;
    this.calls.rpc = 0;
  }

  addDatabase(time: number) {
    this.timers.database += time;
    this.calls.database += 1;
  }

  addRpc(time: number) {
    this.timers.rpc += time;
    this.calls.rpc += 1;
  }
}

export const logger = new Logger();
