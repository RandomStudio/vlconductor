const Player = require("vlconductor");

const player = new Player("media/oops.mp4", { killOnEnd: true });
player.open();
