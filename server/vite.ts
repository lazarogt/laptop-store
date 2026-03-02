import { type Express } from "express";
import { type Server } from "http";

export async function setupVite(_server: Server, app: Express) {
  app.use("/{*path}", (_req, res) => {
    res.status(503).json({
      message: "Frontend dev server is not mounted on backend. Run `npm --prefix client run dev`.",
    });
  });
}
