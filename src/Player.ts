import defaults, { Config, PlaybackOptions } from "./defaults";
import parse from "parse-strings-in-object";
import rc from "rc";
import { EventEmitter } from "events";
import path from "path";
import { execPromise, getAuthCode } from "./utils";

import parser from "fast-xml-parser";
import { getLogger } from "log4js";
import axios from "axios";
import { ChildProcess, exec, execFile } from "child_process";
import { stderr } from "node:process";

const appName = "vlconductor";

const config: typeof defaults = parse(rc(appName, defaults));

export const logger = getLogger(appName);
logger.level = config.loglevel;

class Player extends EventEmitter {
  private filePath: string;
  private options: PlaybackOptions;
  private checkInterval: NodeJS.Timer | null;
  private lastState: "unknown" | "stopped" | "playing";
  private process: ChildProcess | null;

  constructor(file: string, options: Partial<PlaybackOptions>) {
    super();
    logger.info("instance of Player with", { file, options, config });
    this.options = { ...config.options, ...options };
    logger.debug(
      "final options with overrides:",
      JSON.stringify(this.options, null, 2)
    );
    this.lastState = "unknown";
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
    this.checkInterval = setInterval(() => {
      this.fetchStatus();
    }, config.checkInterval);
  }

  async fetchStatus() {
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
      logger.debug({ state, length, position });

      if (this.lastState === "unknown" && state === "playing") {
        this.lastState = "playing";
        this.emit("started");
      }

      if (this.lastState === "playing" && state === "stopped") {
        this.lastState = "stopped";
        this.emit("stopped");
      }
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

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
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
