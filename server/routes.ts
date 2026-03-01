import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage.js";
import { api, errorSchemas } from "../shared/routes.js";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { type User } from "../shared/schema.js";
import { sendOrderNotifications } from "./notifications.js";
import {
  getTelegramBotUsername,
  getTelegramConnectUrlForUser,
  syncTelegramConnectionsFromUpdates,
} from "./telegram.js";
import { pool } from "./db.js";

const MemoryStore = createMemoryStore(session);
const PgSessionStore = connectPgSimple(session);
const ADMIN_EMAIL = "laptopstorecuba@gmail.com";

function sanitizeUser(user: User) {
  const { password, telegramLinkToken, ...safeUser } = user;
  return safeUser;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    cart: { productId: number; quantity: number }[];
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = scryptSync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  storage.getUser(req.session.userId).then(user => {
    if (user?.role !== "admin") {
      return res.status(403).json({ message: "Requiere rol de administrador" });
    }
    next();
  }).catch(next);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (isProduction && !sessionSecret) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  if (isProduction) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid varchar NOT NULL PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire"
      ON user_sessions (expire);
    `);
  }

  const sessionStore = isProduction
    ? new PgSessionStore({
        pool,
        tableName: "user_sessions",
      })
    : new MemoryStore({
        checkPeriod: 86400000,
      });

  app.use(session({
    secret: sessionSecret || "laptop_store_secret_dev",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }));

  app.use((req, res, next) => {
    if (!req.session.cart) {
      req.session.cart = [];
    }
    next();
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email ya registrado", field: "email" });
      }
      const hashedPassword = hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      req.session.userId = user.id;

      res.status(201).json(sanitizeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);
      if (!user || !comparePasswords(input.password, user.password)) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      req.session.userId = user.id;

      res.status(200).json(sanitizeUser(user));
    } catch (err) {
      res.status(401).json({ message: "Credenciales inválidas" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logout exitoso" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    res.status(200).json(sanitizeUser(user));
  });

  app.get(api.telegram.status.path, requireAuth, async (req, res) => {
    try {
      await syncTelegramConnectionsFromUpdates();
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const connected = Boolean(user.telegramChatId);
      const connectUrl = connected
        ? null
        : await getTelegramConnectUrlForUser(user.id, user.telegramLinkToken);

      res.status(200).json({
        connected,
        connectUrl,
        botUsername: getTelegramBotUsername(),
      });
    } catch (error) {
      console.error("[telegram] status error:", error);
      res.status(500).json({ message: "No se pudo obtener el estado de Telegram" });
    }
  });

  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts(req.query as any);
    res.status(200).json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    
    const reviews = await storage.getReviews(product.id);
    res.status(200).json({ ...product, reviews });
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const newProduct = await storage.createProduct(input);
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.put(api.products.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const updated = await storage.updateProduct(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "No encontrado" });
      res.status(200).json(updated);
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.reviews.list.path, async (req, res) => {
    const reviews = await storage.getReviews(Number(req.params.id));
    res.status(200).json(reviews);
  });

  app.post(api.reviews.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.reviews.create.input.parse(req.body);
      const review = await storage.createReview(req.session.userId!, Number(req.params.id), input);
      res.status(201).json(review);
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.get(api.cart.get.path, (req, res) => {
    res.status(200).json(req.session.cart);
  });

  app.post(api.cart.add.path, (req, res) => {
    try {
      const { productId, quantity } = api.cart.add.input.parse(req.body);
      const existing = req.session.cart!.find(i => i.productId === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        req.session.cart!.push({ productId, quantity });
      }
      res.status(200).json(req.session.cart);
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.put(api.cart.update.path, (req, res) => {
    const productId = Number(req.params.id);
    const { quantity } = req.body;
    const item = req.session.cart!.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
    }
    res.status(200).json(req.session.cart);
  });

  app.delete(api.cart.delete.path, (req, res) => {
    const productId = Number(req.params.id);
    req.session.cart = req.session.cart!.filter(i => i.productId !== productId);
    res.status(200).json(req.session.cart);
  });

  app.get(api.wishlist.list.path, requireAuth, async (req, res) => {
    const products = await storage.getWishlist(req.session.userId!);
    res.status(200).json(products);
  });

  app.post(api.wishlist.add.path, requireAuth, async (req, res) => {
    try {
      const { productId } = api.wishlist.add.input.parse(req.body);
      await storage.addToWishlist(req.session.userId!, productId);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.delete(api.wishlist.delete.path, requireAuth, async (req, res) => {
    await storage.removeFromWishlist(req.session.userId!, Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.orders.listMy.path, requireAuth, async (req, res) => {
    const orders = await storage.getOrdersByUser(req.session.userId!);
    res.status(200).json(orders);
  });

  app.get(api.orders.listAll.path, requireAdmin, async (req, res) => {
    const orders = await storage.getAllOrders();
    res.status(200).json(orders);
  });

  app.post(api.orders.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(req.session.userId!, input);
      await syncTelegramConnectionsFromUpdates();

      const orderUser = await storage.getUser(req.session.userId!);
      const uniqueProductIds = [...new Set(input.items.map((item) => item.productId))];
      const productRecords = await Promise.all(uniqueProductIds.map((productId) => storage.getProduct(productId)));
      const productsById = new Map(
        uniqueProductIds.map((productId, index) => [productId, productRecords[index]]),
      );
      const notificationItems = input.items.map((item) => {
        const product = productsById.get(item.productId);
        return {
          productId: item.productId,
          name: product?.name ?? `Producto #${item.productId}`,
          quantity: item.quantity,
          unitPrice: item.price,
          description: product?.description ?? "",
        };
      });

      void sendOrderNotifications({
        orderId: order.id,
        total: order.total,
        customerName: orderUser?.name ?? input.address.fullName,
        customerEmail: orderUser?.email ?? "",
        customerPhone: input.address.phone,
        customerTelegramChatId: orderUser?.telegramChatId ?? undefined,
        items: notificationItems,
        address: input.address,
      }).catch((notificationError) => {
        console.error("[notifications] order notifications failed:", notificationError);
      });

      req.session.cart = [];
      res.status(201).json(order);
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.put(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(Number(req.params.id), status);
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    res.status(200).json(order);
  });

  app.delete(api.orders.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteOrder(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.status(200).json(users.map(sanitizeUser));
  });

  app.put(api.users.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      const updated = await storage.updateUser(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });
      res.status(200).json(sanitizeUser(updated));
    } catch (err) {
      res.status(400).json({ message: "Datos inválidos" });
    }
  });

  app.delete(api.users.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteUser(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.admin.stats.path, requireAdmin, async (req, res) => {
    const stats = await storage.getStats();
    res.status(200).json(stats);
  });

  if (!isProduction) {
    app.post("/api/seed", requireAdmin, async (_req, res) => {
      const count = await storage.getProducts();
      if (count.length === 0) {
        await storage.createProduct({
          name: "ProBook X1",
          slug: "probook-x1",
          description: "Excelente laptop para profesionales con procesador i7 y 16GB de RAM.",
          price: "1299.99",
          stock: 50,
          images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60"],
          specs: { processor: "Intel Core i7", ram: "16GB", storage: "512GB SSD" },
          category: "Ultrabook",
          brand: "HP",
          badges: ["Envío gratis"]
        });
        await storage.createProduct({
          name: "Gaming Beast V",
          slug: "gaming-beast-v",
          description: "Laptop para juegos extremos con RTX 4080 y pantalla 240Hz.",
          price: "2499.99",
          stock: 15,
          images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=60"],
          specs: { processor: "AMD Ryzen 9", ram: "32GB", storage: "1TB NVMe" },
          category: "Gaming",
          brand: "Asus",
          badges: ["Más vendido"]
        });
      }

      const admin = await storage.getUserByEmail(ADMIN_EMAIL);
      if (!admin) {
        await storage.createUser({
          email: ADMIN_EMAIL,
          password: hashPassword("password123"),
          name: "Admin User",
          role: "admin"
        });
      }

      res.status(200).json({ message: "Seed completado" });
    });
  }

  return httpServer;
}
