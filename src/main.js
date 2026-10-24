import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { PORT, TRUST_PROXY } from "./config.js";
import { bootstrapDB } from "./DB/connection.db.js";
import { globalErrorHandling } from "./middleware/index.js";
import {
  authenticationController,
  messageController,
  userController,
} from "./modules/index.js";
import { generateLimiter } from "./common/utils/index.js";

const app = express();

//only trust X-Forwarded-For when the app really sits behind proxies
if (TRUST_PROXY) app.set("trust proxy", TRUST_PROXY);

//1: global middleware
app.use(helmet(), cors(), morgan("common"), generateLimiter(), express.json());
app.use("/assets", express.static("./assets"));

//2: routes
app.all("/", (req, res) =>
  res.status(200).json({ message: "welcome on our API" }),
);
app.use("/users", authenticationController, userController);
app.use("/messages", messageController);

//3: not found and errors
app.all("{/*dummy}", (req, res) =>
  res.status(404).json({ error_message: "In-valid application routing" }),
);
app.use(globalErrorHandling);

//4: connect to the databases then start listening
await bootstrapDB(app, PORT);
