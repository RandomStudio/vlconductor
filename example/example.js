const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4", { loop: true });
player.open();
