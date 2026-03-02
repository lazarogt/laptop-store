import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT ?? "5000", 10);
const CLIENT_URL = process.env.CLIENT_URL ?? "";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const TRUST_PROXY = process.env.TRUST_PROXY ?? (NODE_ENV === "production" ? "1" : "0");
const LOG_API_RESPONSE_BODIES = NODE_ENV !== "production" && process.env.LOG_API_RESPONSE_BODIES === "true";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "https:", "blob:"],
      },
    },
  }),
);
app.use(compression());

if (TRUST_PROXY === "1" || TRUST_PROXY.toLowerCase() === "true") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("CLIENT_URL must be set in production");
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.options("/{*corsPreflight}", cors());

app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: unknown }).rawBody = buf;
    },
    limit: "5mb",
  }),
);
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  if (LOG_API_RESPONSE_BODIES) {
    const originalResJson = res.json.bind(res);

    (res as Response & { json: (body?: unknown) => Response }).json = function (bodyJson?: unknown) {
      try {
        capturedJsonResponse = typeof bodyJson === "object" && bodyJson !== null ? (bodyJson as Record<string, any>) : { data: bodyJson };
      } catch {
        capturedJsonResponse = { info: "unserializable response" };
      }
      return originalResJson(bodyJson);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (LOG_API_RESPONSE_BODIES && capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
        }
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    {
      port: PORT,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${PORT}`);
      log(`CLIENT_URL = ${CLIENT_URL}`);
      log(`NODE_ENV = ${NODE_ENV}`);
    },
  );
})();
