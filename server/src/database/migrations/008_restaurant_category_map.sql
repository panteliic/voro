ALTER TABLE restaurant_category
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE restaurant_category
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_category_slug_unique
  ON restaurant_category (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS restaurant_category_map (
  restaurant_id BIGINT NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES restaurant_category(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (restaurant_id, category_id)
);

CREATE INDEX IF NOT EXISTS restaurant_category_map_category_id_idx
  ON restaurant_category_map (category_id);

INSERT INTO restaurant_category (name, slug, icon, sort_order)
VALUES
  ('Pizza', 'pizza', 'pizza', 10),
  ('Burgers', 'burgers', 'burger', 20),
  ('Serbian', 'serbian', 'utensils', 30),
  ('Italian', 'italian', 'chef-hat', 40),
  ('Asian', 'asian', 'soup', 50),
  ('Sushi', 'sushi', 'fish', 60),
  ('Chinese', 'chinese', 'bowl', 70),
  ('Mexican', 'mexican', 'flame', 80),
  ('Healthy', 'healthy', 'salad', 90),
  ('Vegan', 'vegan', 'leaf', 100),
  ('Desserts', 'desserts', 'ice-cream', 110),
  ('Breakfast', 'breakfast', 'coffee', 120),
  ('Fast food', 'fast-food', 'sandwich', 130)
ON CONFLICT (name) DO UPDATE
SET
  slug = EXCLUDED.slug,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO restaurant_category_map (restaurant_id, category_id)
SELECT id, category_id
FROM restaurant
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;
