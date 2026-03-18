import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type ProductImage = { url: string; thumb?: string | null };

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  telegramChatId: text("telegram_chat_id"),
  telegramLinkToken: text("telegram_link_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
  specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  numReviews: integer("num_reviews").default(0),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  items: jsonb("items").$type<{ productId: number; quantity: number; price: string }[]>().notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  address: jsonb("address").$type<{ fullName: string; street: string; city: string; zip: string; country: string; phone: string }>().notNull(),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlists = pgTable("wishlists", {
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.productId] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  wishlists: many(wishlists),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true, averageRating: true, numReviews: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });


export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Order = typeof orders.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof insertUserSchema>;

export type CreateProductRequest = z.infer<typeof insertProductSchema>;
export type UpdateProductRequest = Partial<CreateProductRequest>;
export interface ProductsQueryParams {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
  search?: string;
}

export const createReviewReqSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3),
});
export type CreateReviewRequest = z.infer<typeof createReviewReqSchema>;

export const createOrderReqSchema = z.object({
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    price: z.string(),
  })),
  total: z.string(),
  address: z.object({
    fullName: z.string(),
    street: z.string(),
    city: z.string(),
    zip: z.string(),
    country: z.string(),
    phone: z.string(),
  }),
});
export type CreateOrderRequest = z.infer<typeof createOrderReqSchema>;
export type UpdateOrderStatusRequest = { status: string };

export const addWishlistReqSchema = z.object({
  productId: z.number(),
});
export type AddWishlistRequest = z.infer<typeof addWishlistReqSchema>;

export const cartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
});
export type CartItemRequest = z.infer<typeof cartItemSchema>;
