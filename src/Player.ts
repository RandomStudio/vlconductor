import defaults, { Config, PlaybackOptions } from "./defaults";
import parse from "parse-strings-in-object";
import rc from "rc";
import { EventEmitter } from "events";
import path from "path";
import { execPromise, getAuthCode } from "./utils";

import parser from "fast-xml-parser";
import { getLogger } from "log4js";
import axios from "axios";
import { ChildProcess, execFile } from "child_process";

const appName = "vlconductor";

const config: typeof defaults = parse(rc(appName, defaults));

export const logger = getLogger(appName);
logger.level = config.loglevel;

class Player extends EventEmitter {
  private filePath: string;
  private options: PlaybackOptions;
  private checkInterval: NodeJS.Timer | null;
  private lastKnown: {
    state?: "stopped" | "playing";
    position?: number;
  };
  private process: ChildProcess | null;

  constructor(file: string, options: Partial<PlaybackOptions>) {
    super();
    logger.info("instance of Player with", { file, options, config });
    this.options = { ...config.options, ...options };
    logger.debug(
      "final options with overrides:",
      JSON.stringify(this.options, null, 2)
    );
    this.lastKnown = {};
    this.filePath = path.resolve(file);
    this.process = null;
    this.checkInterval = null;
  }

  async open() {
    const params = getParams(this.filePath, config.http, this.options);
    logger.info(`run command: "${params}"`);
    this.process = execFile("/usr/bin/vlc", params, (error, stdout, stderr) => {
      logger.trace("exec complete", { error, stdout, stderr });
    });
    this.checkInterval = setInterval(async () => {
      await this.fetchStatus();
      this.emit("status", this.lastKnown);
    }, config.checkInterval);
  }

  private async fetchStatus() {
    try {
      const res = await axios.get(`${getStatusUrl(config.http)}`, {
        headers: {
          Authorization: `Basic ${getAuthCode("", config.http.password)}`,
        },
      });
      const { status, data } = res;
      logger.trace("fetchStatus response:", { status, data });
      const parsed = parser.parse(data);
      // logger.trace("parsed data:", JSON.stringify(parsed, null, 2));
      const { root } = parsed;
      const { state, length, position } = root;
      logger.trace({ state, length, position });

      if (this.lastKnown.state === undefined && state === "playing") {
        this.emit("started");
      }

      if (this.lastKnown.state === "playing" && state === "stopped") {
        this.emit("stopped");
        if (this.options.killOnEnd === true) {
          logger.debug("killOnEnd === true; will close now...");
          this.close();
        }
      }

      if (position === 0 && this.lastKnown.position !== 0) {
        this.emit("zero");
      }

      this.lastKnown.position = position;
      this.lastKnown.state = state;
    } catch (e) {
      if (e.code === "ECONNRESET") {
        logger.debug("reset - probably closing video?");
      } else if (e.code === "ECONNREFUSED") {
        logger.debug("refused - probably video not started yet?");
      } else {
        logger.error("fetchStatus error:", e);
      }
    }
  }

  private async applyCommand(command: string, value?: string) {
    const url = `${getStatusUrl(config.http)}?command=${command}${
      value ? "&val=" + value : ""
    }`;
    logger.debug("applyCommand", { command, value, url });
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Basic ${getAuthCode("", config.http.password)}`,
        },
      });
      logger.trace("applyCommand:", { res });
    } catch (e) {
      logger.error("error in applyCommand response:", e);
    }
  }

  async stop() {
    logger.debug("stop()");
    await this.applyCommand("pl_stop");
  }

  async pause() {
    if (this.lastKnown.state === "playing") {
      logger.debug("pause()");
      await this.applyCommand("pl_pause");
    } else {
      logger.debug("ignore pause(); clip not playing");
    }
  }

  async resume() {
    if (this.lastKnown.state === "playing") {
      logger.debug("ignore resume(); clip already playing");
    } else {
      logger.debug("play()");
      await this.applyCommand("pl_play");
    }
  }

  /**
   * Allowed values are of the form:
   - [+ or -][<int><H or h>:][<int><M or m or '>:][<int><nothing or S or s or ">]
   - [+ or -]<int>%

   (value between [ ] are optional, value between < > are mandatory)

  Examples:
    - 1000 -> seek to the 1000th second
    - +1H:2M -> seek 1 hour and 2 minutes forward
    - -10% -> seek 10% back
   */
  async seek(value: string) {
    logger.debug("seek()", { value });
    await this.applyCommand("seek", value);
  }
  // TODO: possibly split this into different functions for the different types of values?

  async close(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      if (this.lastKnown.state === "playing") {
        await this.stop();
      }
      if (this.process) {
        logger.debug("waiting to kill proces...");
        logger.trace("should kill process", this.process, "...");
        this.process.on("exit", () => {
          logger.debug("exit");
          resolve();
        });
        const success = this.process.kill();
        if (success) {
          logger.info("kill process OK");
        } else {
          logger.error("failed to kill process");
        }
      } else {
        resolve();
      }
    });
  }
}

const getStatusUrl = (http: Config["http"]) =>
  `http://localhost:${http.port}/requests/status.xml`;

const getParams = (
  fullPath: string,
  http: Config["http"],
  options: PlaybackOptions
): string[] => [
  "--no-osd",
  "-I http",
  "--http-password",
  http.password,
  "--http-host",
  http.host,
  "--http-port",
  http.port.toString(),
  fullPath,
  options.loop === true ? "--loop" : undefined,
];

export default Player;
