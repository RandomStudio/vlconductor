// Our modules
import defaults, { PlaybackOptions } from "./defaults";
import {
  getAuthCode,
  getParams,
  getStatusUrl,
  positionToSeconds,
  secondsToPosition,
} from "./utils";

// Built-in modules
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";

// Third-party modules
import parse from "parse-strings-in-object";
import rc from "rc";
import parser from "fast-xml-parser";
import { getLogger } from "log4js";
import axios from "axios";
import { ChildProcess, execFile } from "child_process";

// Config and logging
const appName = "vlconductor";
const config: typeof defaults = parse(rc(appName, defaults));
export const logger = getLogger(appName);
logger.level = config.loglevel;

// Shared types
interface Trigger {
  position?: number;
  seconds?: number;
  handler: (position?: number) => void;
  alreadyTrigged: boolean;
  once: boolean;
}

// Main class implementation
class Player extends EventEmitter {
  private filePath: string;
  private options: PlaybackOptions;
  private checkInterval: NodeJS.Timer | null;
  private lastKnown: {
    state?: "stopped" | "playing" | "paused";
    position?: number;
    length?: number;
  };
  private doneImmediatePause: boolean;
  private process: ChildProcess | null;
  private triggers: Trigger[];

  constructor(file: string, options?: Partial<PlaybackOptions>) {
    super();
    logger.info("instance of Player with", { file, options, config });
    this.options = { ...config.options, ...options };
    logger.debug(
      "final options with overrides:",
      JSON.stringify(this.options, null, 2)
    );
    this.lastKnown = {};
    this.filePath = path.resolve(file);
    fs.access(this.filePath)
      .then(() => {})
      .catch((e) => {
        logger.fatal(
          `could not access file at path "${this.filePath}"; error: ${e}`
        );
        throw Error(e);
      });
    this.process = null;
    this.checkInterval = null;
    this.triggers = [];
    this.doneImmediatePause = false;
  }

  async open() {
    const params = getParams(this.filePath, config.http, this.options);
    logger.info(`run command: "${params}"`);
    this.process = execFile("/usr/bin/vlc", params, (error, stdout, stderr) => {
      logger.trace("exec complete", { error, stdout, stderr });
    });
    this.checkInterval = setInterval(async () => {
      await this.fetchStatus();
      this.checkForEvents();
      this.emit("status", this.lastKnown);
    }, config.checkInterval);
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
    this.resetTriggers();
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

  addPositionEvent(
    position: number,
    handler: (position?: number) => void,
    once = false
  ) {
    this.triggers.push({
      position,
      handler,
      alreadyTrigged: false,
      once,
    });
    logger.info(
      "added position trigger/event at",
      position,
      "; now there are",
      this.triggers.length
    );
  }

  addTimeEvent(
    seconds: number,
    handler: (position?: number) => void,
    once = false
  ) {
    this.triggers.push({
      seconds,
      handler,
      alreadyTrigged: false,
      once,
    });
    logger.info(
      "added time event trigger/event at",
      seconds,
      "seconds ; now there are",
      this.triggers.length
    );
  }

  getPlayState() {
    return this.lastKnown.state;
  }

  getPosition() {
    return this.lastKnown.position;
  }

  getSeconds() {
    return positionToSeconds(this.lastKnown.position, this.lastKnown.length);
  }

  // ----------------------------------------------------------------
  // PRIVATE MEMBER FUNCTIONS
  // ----------------------------------------------------------------

  private resetTriggers() {
    logger.debug("reset all triggers");
    this.triggers.forEach((t) => (t.alreadyTrigged = false));
  }

  private async fetchStatus() {
    // const start = Date.now();
    try {
      const res = await axios.get(`${getStatusUrl(config.http)}`, {
        headers: {
          Authorization: `Basic ${getAuthCode("", config.http.password)}`,
        },
      });
      // logger.debug("elapsed1:", Date.now() - start, "ms");
      const { status, data } = res;
      // logger.trace("fetchStatus response:", { status, data });
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
        this.triggers.forEach((trigger) => {
          trigger.alreadyTrigged = false;
        });
      }

      this.lastKnown = {
        position,
        state,
        length,
      };
      if (
        this.options.immediatePause === true &&
        this.doneImmediatePause === false
      ) {
        if (position > 0) {
          logger.debug(
            "Immediate pause?",
            JSON.stringify({ position, length, state })
          );
          logger.info("Immediate pause requested; ready to pause now...");
          this.doneImmediatePause = true;
          await this.pause();
        }
      }

      // logger.debug("elapsed2:", Date.now() - start, "ms");
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

  private checkForEvents = () => {
    const { position, length } = this.lastKnown;
    this.triggers.forEach((trigger) => {
      // Position-based triggers:
      if (trigger.position !== undefined) {
        if (!trigger.alreadyTrigged && position >= trigger.position) {
          trigger.alreadyTrigged = true;
          trigger.handler(position);
          logger.debug(
            "POSITION trigger for",
            { ...trigger },
            "at position",
            position
          );
        }
      }

      // Time (seconds)-based triggers:
      // Apparently vlc can report length === -1 at some point,
      // presumably when video not fully loaded
      if (trigger.seconds !== undefined && length !== undefined && length > 0) {
        if (
          !trigger.alreadyTrigged &&
          position >= secondsToPosition(trigger.seconds, length)
        ) {
          trigger.alreadyTrigged = true;
          trigger.handler(position);
          logger.debug(
            "TIME trigger for",
            { ...trigger },
            "at seconds:",
            trigger.seconds,
            "/ position",
            position,
            { length }
          );
        }
      }

      // Check for once-off triggers to be deleted
      const toDelete = this.triggers.filter(
        (t) => t.once === true && t.alreadyTrigged === true
      );
      if (toDelete.length > 0) {
        logger.debug("deleting", toDelete.length, "once-off triggers...");
        this.triggers = this.triggers.filter((t) => t.once === false);
      }
    });
  };
}

export default Player;
