import { db } from "./db";
import { eq, or, and, ilike, gte, lte, desc, asc } from "drizzle-orm";
import { 
  users, products, reviews, orders, wishlists,
  type User, type Product, type Review, type Order,
  type CreateProductRequest, type UpdateProductRequest,
  type CreateReviewRequest, type CreateOrderRequest,
  type ProductsQueryParams, type RegisterRequest
} from "@shared/schema";

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: RegisterRequest): Promise<User>;

  // Products
  getProducts(params?: ProductsQueryParams): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: CreateProductRequest): Promise<Product>;
  updateProduct(id: number, product: UpdateProductRequest): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Reviews
  getReviews(productId: number): Promise<(Review & { user: User })[]>;
  createReview(userId: number, productId: number, review: CreateReviewRequest): Promise<Review>;

  // Orders
  getOrdersByUser(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(userId: number, order: CreateOrderRequest): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Wishlist
  getWishlist(userId: number): Promise<Product[]>;
  addToWishlist(userId: number, productId: number): Promise<void>;
  removeFromWishlist(userId: number, productId: number): Promise<void>;

  // Admin
  getStats(): Promise<{ totalUsers: number; totalProducts: number; totalOrders: number; totalRevenue: string }>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: RegisterRequest): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Products
  async getProducts(params?: ProductsQueryParams): Promise<Product[]> {
    let query = db.select().from(products).$dynamic();
    
    const conditions = [];
    if (params?.category) conditions.push(eq(products.category, params.category));
    if (params?.brand) conditions.push(eq(products.brand, params.brand));
    if (params?.minPrice) conditions.push(gte(products.price, params.minPrice));
    if (params?.maxPrice) conditions.push(lte(products.price, params.maxPrice));
    if (params?.search) {
      conditions.push(or(
        ilike(products.name, `%${params.search}%`),
        ilike(products.description, `%${params.search}%`)
      ));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (params?.sort === "price_asc") query = query.orderBy(asc(products.price));
    else if (params?.sort === "price_desc") query = query.orderBy(desc(products.price));
    else if (params?.sort === "rating") query = query.orderBy(desc(products.averageRating));
    else if (params?.sort === "newest") query = query.orderBy(desc(products.createdAt));
    else query = query.orderBy(desc(products.createdAt));

    return await query;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async createProduct(product: CreateProductRequest): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Reviews
  async getReviews(productId: number): Promise<(Review & { user: User })[]> {
    return await db.query.reviews.findMany({
      where: eq(reviews.productId, productId),
      with: {
        user: true
      },
      orderBy: [desc(reviews.createdAt)]
    });
  }

  async createReview(userId: number, productId: number, review: CreateReviewRequest): Promise<Review> {
    const [newReview] = await db.insert(reviews).values({
      userId,
      productId,
      rating: review.rating,
      comment: review.comment
    }).returning();

    // Update average rating
    const allReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.productId, productId));
    const avg = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;
    await db.update(products)
      .set({ averageRating: avg.toFixed(2), numReviews: allReviews.length })
      .where(eq(products.id, productId));

    return newReview;
  }

  // Orders
  async getOrdersByUser(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(userId: number, order: CreateOrderRequest): Promise<Order> {
    const [newOrder] = await db.insert(orders).values({
      userId,
      ...order,
    }).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Wishlist
  async getWishlist(userId: number): Promise<Product[]> {
    const userWishlists = await db.query.wishlists.findMany({
      where: eq(wishlists.userId, userId),
    });
    
    if (userWishlists.length === 0) return [];
    
    const productIds = userWishlists.map(w => w.productId);
    
    // Fallback if no products
    let result: Product[] = [];
    for (const pid of productIds) {
       const [prod] = await db.select().from(products).where(eq(products.id, pid));
       if (prod) result.push(prod);
    }
    return result;
  }

  async addToWishlist(userId: number, productId: number): Promise<void> {
    await db.insert(wishlists).values({ userId, productId }).onConflictDoNothing();
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
  }

  // Admin Stats
  async getStats(): Promise<{ totalUsers: number; totalProducts: number; totalOrders: number; totalRevenue: string }> {
    const allUsers = await db.select().from(users);
    const allProducts = await db.select().from(products);
    const allOrders = await db.select().from(orders);
    
    const totalRevenue = allOrders.reduce((acc, curr) => acc + Number(curr.total), 0).toFixed(2);
    
    return {
      totalUsers: allUsers.length,
      totalProducts: allProducts.length,
      totalOrders: allOrders.length,
      totalRevenue
    };
  }
}

export const storage = new DatabaseStorage();
