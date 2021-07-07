const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4");
player.open();

player.on("started", () => {
  console.log("****************** STARTED");
});

player.on("stopped", async () => {
  console.log("****************** STOPPED");
  await player.close();
});
