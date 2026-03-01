import { db } from "./db.js";
import { eq } from "drizzle-orm";
import { products, users, reviews } from "../shared/schema.js";
import { randomBytes, scryptSync } from "crypto";
import "dotenv/config";

const ADMIN_EMAIL = "laptopstorecuba@gmail.com";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Seeding database...");

  const adminPassword = hashPassword("password123");
  const [admin] = await db.insert(users).values({
    email: ADMIN_EMAIL,
    name: "Admin User",
    password: adminPassword,
    role: "admin",
  }).onConflictDoNothing().returning();

  const userPassword = hashPassword("password123");
  const [normalUser] = await db.insert(users).values({
    email: "user@test.com",
    name: "Test User",
    password: userPassword,
    role: "user",
  }).onConflictDoNothing().returning();

  const existingProducts = await db.select().from(products);
  if (existingProducts.length === 0) {
    console.log("Inserting sample products...");
    const sampleProducts: Array<typeof products.$inferInsert> = [
      {
        name: "ProBook X1 Professional",
        slug: "probook-x1-professional",
        description: "Excelente laptop para profesionales y creadores de contenido, equipada con procesador de última generación y pantalla 4K.",
        price: "1299.99",
        stock: 50,
        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=60"],
        specs: { processor: "Intel Core i7 13th Gen", ram: "16GB LPDDR5", storage: "512GB NVMe SSD", display: "14-inch 4K OLED" },
        category: "Ultrabook",
        brand: "HP",
        badges: ["Envío gratis"],
      },
      {
        name: "Gaming Beast V",
        slug: "gaming-beast-v",
        description: "Laptop para juegos extremos con RTX 4080, pantalla 240Hz y teclado mecánico.",
        price: "2499.99",
        stock: 15,
        images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=60"],
        specs: { processor: "AMD Ryzen 9 7900HX", ram: "32GB DDR5", storage: "1TB NVMe SSD", gpu: "RTX 4080 12GB" },
        category: "Gaming",
        brand: "Asus",
        badges: ["Más vendido", "Oferta"],
      },
      {
        name: "DevBook Pro 16",
        slug: "devbook-pro-16",
        description: "Diseñada para desarrolladores exigentes. Batería de larga duración y compilación ultra rápida.",
        price: "1999.00",
        stock: 30,
        images: ["https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=800&auto=format&fit=crop&q=60"],
        specs: { processor: "M2 Pro (Equiv)", ram: "32GB Unified", storage: "1TB SSD" },
        category: "Workstation",
        brand: "Apple",
        badges: [],
      },
      {
        name: "StudentLite 14",
        slug: "studentlite-14",
        description: "Ligera, económica y perfecta para el día a día universitario.",
        price: "499.50",
        stock: 100,
        images: ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60"],
        specs: { processor: "Intel Core i3", ram: "8GB", storage: "256GB SSD" },
        category: "Estudiantes",
        brand: "Lenovo",
        badges: ["Ideal estudiantes"],
      }
    ];

    const insertedProducts = await db.insert(products).values(sampleProducts).returning();

    if (normalUser && insertedProducts.length > 0) {
      await db.insert(reviews).values({
        userId: normalUser.id,
        productId: insertedProducts[0].id,
        rating: 5,
        comment: "¡Excelente laptop! Muy rápida y ligera. Totalmente recomendada.",
      });
      
      await db.update(products).set({ averageRating: "5.00", numReviews: 1 }).where(eq(products.id, insertedProducts[0].id));
    }
  }

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
