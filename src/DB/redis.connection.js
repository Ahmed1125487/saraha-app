import { createClient } from "redis";
import { REDIS_URI } from "../config.js";

export const client = createClient({
  url: REDIS_URI,
  socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 3000) },
});

//without this listener a redis error would crash the process
let lastLogTime = 0;
client.on("error", (error) => {
  if (Date.now() - lastLogTime > 10000) {
    lastLogTime = Date.now();
    console.log("redis error:", error.message);
  }
});

export async function connectRedis() {
  try {
    await client.connect();
    console.log("redis connected successfully");
  } catch (error) {
    console.log("fail to connect redis, running without cache");
  }
}
