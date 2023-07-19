import { spawn } from "node:child_process";

export const cli = {
  rm,
  ln,
  run,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Execute rm command on target.
 *
 * @param target - Target to remove.
 */
async function rm(target: string): Promise<void> {
  await cli.run("rm", ["-f", target]);
}

/**
 * Create a hard link between source and target.
 *
 * @param source - Source to link from.
 * @param target - Target to link to.
 */
async function ln(source: string, target: string): Promise<void> {
  await cli.run("ln", ["-f", source, target]);
}

/**
 * Execute command with args and return output.
 *
 * @param command - Command to execute.
 * @param args    - Arguments to pass to command.
 *
 * @returns Output of command.
 */
async function run(command: string, args: ReadonlyArray<string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let output = "";

    child.stdout.on("data", (data) => {
      output += data;
    });

    child.stderr.on("data", (data) => {
      output += data;
    });

    child.on("error", (error) => {
      console.log(`error: ${error.message}`);
      reject(`${error.message}`);
    });

    child.on("close", () => {
      resolve(`${output}`);
    });
  });
}
