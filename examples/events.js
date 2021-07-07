const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4", { killOnEnd: true });

player.addPositionEvent(0.2, () => {
  console.log("****************** hit trigger 1!");
});
player.addPositionEvent(0.8, () => {
  console.log("****************** hit trigger 2!");
});

player.open();

player.on("stopped", async () => {
  console.log("****************** STOPPED");
  // await player.close();

  const looped = new Player("media/tenseconds.mp4", { loop: true });
  looped.addPositionEvent(0.5, (position) => {
    console.log("looping; halfway mark at", position);
    console.log("Ctrl+C to stop");
  });

  looped.open();
});
