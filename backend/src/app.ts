import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOptionsDelegate } from "./config/cors.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFound } from "./middlewares/not-found.js";
import { validateOrigin } from "./middlewares/validate-origin.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(validateOrigin);

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);
