import defaults from "./defaults";
import parse from "parse-strings-in-object";
import rc from "rc";
import { getLogger } from "log4js";
import { EventEmitter } from "events";
import path from "path";
import { execPromise } from "./utils";

const config: typeof defaults = parse(rc("vlconductor", defaults));

export const logger = getLogger();
logger.level = config.loglevel;


class Player extends EventEmitter {

  private filePath: string;

  constructor(file: string) {
    super();
    logger.info("instance of Player with config", config);
    this.filePath = path.resolve(file);
  }

  async open() {
    const cmd = `vlc cvlc ${this.filePath}`;
    logger.debug(`run command: "${cmd}"`)
    try {
      const res = await execPromise(cmd);
      logger.debug("command completed", res);
    } catch(e) {
      logger.error("open error: " + e);
    }
  }
}

export default Player;