import mongoose from "mongoose";
import { DB_URI } from "../config.js";
import "./model/index.js";
import { connectRedis } from "./redis.connection.js";

export const bootstrapDB = async (app, port) => {
  try {
    await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.syncIndexes()),
    );
    console.log("connect on DB");

    await connectRedis();

    app.listen(port, () => console.log(`app is listening on port : ${port}`));
  } catch (error) {
    console.log("fail on connecting DB", error.message);
    process.exit(1);
  }
};
