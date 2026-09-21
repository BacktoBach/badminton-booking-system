import { Router, type RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../openapi/index.js";

export const swaggerRouter = Router();

swaggerRouter.get("/docs.json", (_request, response) => {
  response.status(200).json(openApiDocument);
});

const allowSwaggerInlineAssets: RequestHandler = (_request, response, next) => {
  response.removeHeader("Content-Security-Policy");
  next();
};

swaggerRouter.use("/docs", allowSwaggerInlineAssets, swaggerUi.serve);
swaggerRouter.get(
  "/docs",
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Badminton Booking API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
      withCredentials: true,
    },
  }),
);
