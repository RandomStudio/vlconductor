const Player = require("vlconductor");

const player = new Player("media/tenseconds.mp4");
player.open();

player.on("started", () => {
  console.log("****************** STARTED");
});

player.on("stopped", async () => {
  console.log("****************** STOPPED");
  await player.close();

  const looper = new Player("media/tenseconds.mp4", { loop: true });
  let count = 0;
  looper.open();
  looper.on("zero", async () => {
    count++;
    console.log("****************** ZERO");
    console.log({ count });
    if (count >= 3) {
      console.log("that's enough", { count });
      await looper.close();
    }
  });
});
