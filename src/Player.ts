import defaults from "./defaults";
import parse from "parse-strings-in-object";
import rc from "rc";
import { getLogger } from "log4js";
import { EventEmitter } from "events";

const config: typeof defaults = parse(rc("vlconductor", defaults));

const logger = getLogger();
logger.level = config.loglevel;


class Player extends EventEmitter {
  constructor() {
    super();
    logger.info("instance of Player with config", config);

  }
}

export default Player;