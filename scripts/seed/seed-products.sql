INSERT INTO products (name, slug, description, price, stock, images, specs, category, brand, badges)
VALUES
  (
    'Laptop Store Seed Pro 14',
    'laptop-store-seed-pro-14',
    'Sample seeded ultrabook for local production checks.',
    1499.00,
    8,
    '["https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '{"cpu":"Intel Core Ultra 7","ram":"32GB","storage":"1TB SSD","display":"14-inch OLED"}'::jsonb,
    'Ultrabook',
    'Laptop Store',
    '["seed","featured"]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  images = EXCLUDED.images,
  specs = EXCLUDED.specs,
  category = EXCLUDED.category,
  brand = EXCLUDED.brand,
  badges = EXCLUDED.badges;
