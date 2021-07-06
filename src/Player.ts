import defaults, { Config, PlaybackOptions } from "./defaults";
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
  private options: PlaybackOptions;

  constructor(file: string, options: Partial<PlaybackOptions>) {
    super();
    logger.info("instance of Player with", { file, options, config });
    this.options = { ...config.options, ...options };
    logger.debug(
      "final options with overrides:",
      JSON.stringify(this.options, null, 2)
    );
    this.filePath = path.resolve(file);
  }

  async open() {
    const cmd = getCommand(this.filePath, config.http, this.options);
    logger.info(`run command: "${cmd}"`);
    try {
      const res = await execPromise(cmd);
      logger.debug("command completed", res);
    } catch (e) {
      logger.error("open error: " + e);
    }
  }
}

const getCommand = (
  fullPath: string,
  http: Config["http"],
  options: PlaybackOptions
) =>
  `vlc cvlc -I http --http-password ${http.password} --http-host ${
    http.host
  } --http-port ${http.port} ${fullPath} ${options.loop ? "--loop" : ""}`;

export default Player;
