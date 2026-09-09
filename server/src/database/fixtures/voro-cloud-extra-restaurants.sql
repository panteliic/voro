-- Voro: additional restaurant catalogue for Supabase
-- Run this file AFTER you have already run voro-cloud-test-data.sql.
-- It does NOT touch your existing users, orders, addresses or the first three
-- restaurants. It only adds/updates 60 extra restaurants, their managers and
-- their menus. All manager passwords are: password123

BEGIN;

INSERT INTO restaurant_category (name, slug, icon, sort_order)
VALUES
  ('Pizza', 'pizza', 'pizza', 10),
  ('Burgers', 'burgers', 'burger', 20),
  ('Serbian', 'serbian', 'utensils', 30),
  ('Italian', 'italian', 'chef-hat', 40),
  ('Pasta', 'pasta', 'pasta', 50),
  ('Asian', 'asian', 'soup', 60),
  ('Sushi', 'sushi', 'fish', 70),
  ('Chinese', 'chinese', 'bowl', 80),
  ('Mexican', 'mexican', 'flame', 90),
  ('Healthy', 'healthy', 'salad', 100),
  ('Vegan', 'vegan', 'leaf', 110),
  ('Desserts', 'desserts', 'ice-cream', 120),
  ('Breakfast', 'breakfast', 'coffee', 130),
  ('Fast food', 'fast-food', 'sandwich', 140),
  ('Chicken', 'chicken', 'drumstick', 150),
  ('American', 'american', 'beef', 160),
  ('Indian', 'indian', 'cooking-pot', 170),
  ('Middle Eastern', 'middle-eastern', 'wrap', 180),
  ('Gyros', 'gyros', 'wrap', 190),
  ('Pancakes', 'pancakes', 'cake-slice', 200)
ON CONFLICT (name) DO UPDATE
SET slug = EXCLUDED.slug,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- This is deliberately a short-lived normal table rather than a TEMP table:
-- Supabase SQL Editor can split a pasted script into individual statements.
CREATE TABLE IF NOT EXISTS voro_extra_restaurant_import (
  position INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  secondary_category_slug TEXT NOT NULL
);

TRUNCATE TABLE voro_extra_restaurant_import;

INSERT INTO voro_extra_restaurant_import (position, name, category_slug, secondary_category_slug)
VALUES
  (1, 'Picerija Dunav', 'pizza', 'italian'),
  (2, 'Italiana Vracar', 'italian', 'pasta'),
  (3, 'Testenina 21', 'pasta', 'italian'),
  (4, 'Pizza Kruna', 'pizza', 'fast-food'),
  (5, 'La Casa Pasta', 'pasta', 'italian'),
  (6, 'Napoli Express', 'pizza', 'italian'),
  (7, 'Smash Corner', 'burgers', 'american'),
  (8, 'Burger Republika', 'burgers', 'american'),
  (9, 'Grill and Bun', 'burgers', 'fast-food'),
  (10, 'Street Bite', 'fast-food', 'burgers'),
  (11, 'Rostilj 011', 'serbian', 'fast-food'),
  (12, 'Chicken District', 'chicken', 'fast-food'),
  (13, 'Zeleni Rostilj', 'serbian', 'healthy'),
  (14, 'Leskovacki Kutak', 'serbian', 'fast-food'),
  (15, 'Daska i Meso', 'serbian', 'american'),
  (16, 'Cevap Kuca', 'serbian', 'fast-food'),
  (17, 'Wok Station', 'asian', 'chinese'),
  (18, 'Asian Bowl', 'asian', 'healthy'),
  (19, 'Kina Garden', 'chinese', 'asian'),
  (20, 'Noodle Lab', 'chinese', 'asian'),
  (21, 'Tokyo Roll', 'sushi', 'asian'),
  (22, 'Sushi Studio', 'sushi', 'asian'),
  (23, 'Maki House', 'sushi', 'asian'),
  (24, 'Ramen Corner', 'asian', 'sushi'),
  (25, 'Burrito Barrio', 'mexican', 'fast-food'),
  (26, 'Taco Plaza', 'mexican', 'fast-food'),
  (27, 'Quesadilla House', 'mexican', 'fast-food'),
  (28, 'Mexicano 24', 'mexican', 'fast-food'),
  (29, 'Green Bowl', 'healthy', 'vegan'),
  (30, 'Fresh and Fit', 'healthy', 'breakfast'),
  (31, 'Salata Plus', 'healthy', 'vegan'),
  (32, 'Veganski Sto', 'vegan', 'healthy'),
  (33, 'Leaf Kitchen', 'vegan', 'healthy'),
  (34, 'Plant Power', 'vegan', 'healthy'),
  (35, 'Slatka Kuca', 'desserts', 'pancakes'),
  (36, 'Kolac Lab', 'desserts', 'pancakes'),
  (37, 'Donut Corner', 'desserts', 'breakfast'),
  (38, 'Pancake Story', 'pancakes', 'desserts'),
  (39, 'Jutro Cafe', 'breakfast', 'healthy'),
  (40, 'Brunch House', 'breakfast', 'healthy'),
  (41, 'Omlet Bar', 'breakfast', 'healthy'),
  (42, 'Pekara i Dorucak', 'breakfast', 'fast-food'),
  (43, 'Gyros Corner', 'gyros', 'fast-food'),
  (44, 'Grcki Tanjir', 'gyros', 'healthy'),
  (45, 'Shawarma Hub', 'middle-eastern', 'fast-food'),
  (46, 'Falafel Garden', 'middle-eastern', 'vegan'),
  (47, 'Biryani Box', 'indian', 'asian'),
  (48, 'Curry House', 'indian', 'asian'),
  (49, 'Balkan Meso', 'serbian', 'fast-food'),
  (50, 'Domaca Trpeza', 'serbian', 'breakfast'),
  (51, 'Kafana Kod Mosta', 'serbian', 'breakfast'),
  (52, 'Sarma i Supa', 'serbian', 'healthy'),
  (53, 'Sendvic Bar', 'fast-food', 'breakfast'),
  (54, 'Wrap Works', 'fast-food', 'chicken'),
  (55, 'Hot Dog Garage', 'fast-food', 'american'),
  (56, 'Pomfrit Kralj', 'fast-food', 'burgers'),
  (57, 'Morski Tanjir', 'sushi', 'healthy'),
  (58, 'Seafood Point', 'sushi', 'asian'),
  (59, 'Balkan Sweets', 'desserts', 'pancakes'),
  (60, 'Zdravi Zalogaj', 'healthy', 'vegan');

INSERT INTO restaurant (
  category_id, name, description, phone, email, address, latitude, longitude,
  is_active, is_accepting_orders, preparation_minutes, delivery_radius_km
)
SELECT
  category.id,
  input.name,
  'Voro test restoran: ' || input.name || '.',
  '+381641' || LPAD(input.position::TEXT, 6, '0'),
  'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
  'Voro lokacija ' || input.position || ', Beograd',
  (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
  (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
  TRUE, TRUE, 20 + (input.position % 3) * 5, 8.00
FROM voro_extra_restaurant_import input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM restaurant existing
  WHERE LOWER(existing.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test')
);

UPDATE restaurant
SET
  category_id = category.id,
  name = input.name,
  description = 'Voro test restoran: ' || input.name || '.',
  phone = '+381641' || LPAD(input.position::TEXT, 6, '0'),
  address = 'Voro lokacija ' || input.position || ', Beograd',
  latitude = (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
  longitude = (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
  is_active = TRUE,
  is_accepting_orders = TRUE,
  preparation_minutes = 20 + (input.position % 3) * 5,
  delivery_radius_km = 8.00,
  updated_at = NOW()
FROM voro_extra_restaurant_import input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE LOWER(restaurant.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test');

INSERT INTO restaurant_user (restaurant_id, name, email, password, access_role, is_active, email_verified)
SELECT
  restaurant.id,
  'Menadzer ' || LPAD(input.position::TEXT, 2, '0'),
  'manager.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  'manager', TRUE, TRUE
FROM voro_extra_restaurant_import input
INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
ON CONFLICT ((LOWER(email))) DO UPDATE
SET restaurant_id = EXCLUDED.restaurant_id,
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    access_role = 'manager',
    is_active = TRUE,
    email_verified = TRUE,
    updated_at = NOW();

INSERT INTO restaurant_category_map (restaurant_id, category_id)
SELECT restaurant.id, category.id
FROM voro_extra_restaurant_import input
INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
INNER JOIN restaurant_category category ON category.slug IN (input.category_slug, input.secondary_category_slug)
ON CONFLICT DO NOTHING;

WITH target_restaurants AS (
  SELECT restaurant.id
  FROM restaurant
  WHERE restaurant.email LIKE 'restoran.%@voro.test'
), menu_categories AS (
  SELECT *
  FROM (VALUES
    ('Glavna jela', 'Glavni obroci i specijaliteti restorana.'),
    ('Dodaci', 'Prilozi, salate i dodatni ukusi.'),
    ('Pice', 'Bezalkoholna pica uz obrok.')
  ) AS value(name, description)
)
INSERT INTO product_category (restaurant_id, name, description)
SELECT target.id, category.name, category.description
FROM target_restaurants target
CROSS JOIN menu_categories category
ON CONFLICT (restaurant_id, name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = NOW();

WITH target_restaurants AS (
  SELECT restaurant.id, COALESCE(category.slug, 'fast-food') AS category_slug
  FROM restaurant
  LEFT JOIN restaurant_category category ON category.id = restaurant.category_id
  WHERE restaurant.email LIKE 'restoran.%@voro.test'
), menu_items AS (
  SELECT target.id AS restaurant_id, target.category_slug, item.name, item.position::INTEGER AS position
  FROM target_restaurants target
  CROSS JOIN LATERAL UNNEST(
    CASE
      WHEN target.category_slug = 'pizza' THEN ARRAY['Margherita', 'Capricciosa', 'Pepperoni', 'Quattro formaggi', 'Prosciutto pizza', 'Vegetariana', 'Diavola', 'Pizza kuce', 'Pomfrit', 'Bruschette', 'Pohovani sir', 'Masline i focaccia', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limenka sok']
      WHEN target.category_slug IN ('italian', 'pasta') THEN ARRAY['Penne arrabbiata', 'Spaghetti bolognese', 'Pasta carbonara', 'Tagliatelle pollo', 'Lasagna bolonjeze', 'Ravioli ricotta', 'Gnocchi quattro formaggi', 'Risotto sa piletinom', 'Focaccia', 'Bruschette', 'Zelena salata', 'Tiramisu', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
      WHEN target.category_slug IN ('burgers', 'american') THEN ARRAY['Classic burger', 'Cheeseburger', 'Double smash burger', 'Bacon burger', 'Crispy chicken burger', 'Veggie burger', 'BBQ burger', 'Truffle burger', 'Pomfrit', 'Onion rings', 'Loaded fries', 'Chicken nuggets', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
      WHEN target.category_slug = 'chicken' THEN ARRAY['Zinger burger', 'Crispy strips', 'Hot wings', 'Pileci wrap', 'Bucket za dvoje', 'Pileci file', 'Chicken nuggets', 'BBQ krilca', 'Pomfrit', 'Coleslaw', 'Onion rings', 'Cheddar sos', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
      WHEN target.category_slug = 'serbian' THEN ARRAY['Cevapi u lepinji', 'Gurmanska pljeskavica', 'Pileci file', 'Dimljena vesalica', 'Kobasica sa kajmakom', 'Karadjordjeva snicla', 'Ustipci', 'Domaca sarma', 'Pomfrit', 'Sopska salata', 'Lepinja', 'Kajmak', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Jogurt']
      WHEN target.category_slug IN ('asian', 'chinese') THEN ARRAY['Pad thai', 'Teriyaki piletina', 'Wok nudle sa piletinom', 'Przeni pirinac', 'Kung pao piletina', 'Govedina u slatko-kiselom sosu', 'Spring rolls', 'Dim sum', 'Miso supa', 'Edamame', 'Wok povrce', 'Kimchi salata', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Zeleni caj']
      WHEN target.category_slug = 'sushi' THEN ARRAY['California roll', 'Spicy tuna roll', 'Salmon nigiri', 'Veggie maki', 'Tempura roll', 'Sushi klasik set', 'Philadelphia roll', 'Dragon roll', 'Miso supa', 'Edamame', 'Wakame salata', 'Soja sos', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Zeleni caj']
      WHEN target.category_slug = 'mexican' THEN ARRAY['Chicken burrito', 'Beef burrito', 'Quesadilla pollo', 'Taco trio', 'Nachos sa sirom', 'Chili con carne', 'Veggie burrito', 'Mexican bowl', 'Guacamole', 'Salsa fresca', 'Pomfrit', 'Jalapeno sos', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
      WHEN target.category_slug IN ('healthy', 'vegan') THEN ARRAY['Cezar salata', 'Mediterranean bowl', 'Tofu bowl', 'Falafel salad', 'Vegan burger', 'Chicken quinoa bowl', 'Avocado tost', 'Proteinska salata', 'Humus', 'Grilovano povrce', 'Integralni hleb', 'Vocna salata', 'Coca-Cola Zero 0.5l', 'Voda 0.5l', 'Sok od narandze']
      WHEN target.category_slug IN ('desserts', 'pancakes') THEN ARRAY['Nutella palacinka', 'Plazma palacinka', 'Cheesecake', 'Cokoladni lava kolac', 'Tiramisu', 'Panna cotta', 'Krofna sa vanilom', 'Vocna palacinka', 'Sladoled kugla', 'Preliv cokolada', 'Preliv karamela', 'Plazma dodatak', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Milkshake']
      WHEN target.category_slug = 'breakfast' THEN ARRAY['Omlet sa sirom', 'Jaja na oko', 'Avokado tost', 'Engleski dorucak', 'Pohovani hleb', 'Palacinke sa dzemom', 'Sendvic sa prsutom', 'Granola bowl', 'Kroasan', 'Vocna salata', 'Jogurt', 'Domaci hleb', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Kafa latte']
      WHEN target.category_slug = 'gyros' THEN ARRAY['Pileci giros', 'Svinjski giros', 'Gyros box', 'Pita giros', 'Gyros salata', 'Halloumi giros', 'Biftek giros', 'Vegetarijanski giros', 'Pomfrit sa fetom', 'Tzatziki', 'Grcka salata', 'Pita hleb', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
      WHEN target.category_slug = 'middle-eastern' THEN ARRAY['Chicken shawarma', 'Falafel wrap', 'Hummus sa lepinjom', 'Kebab tanjir', 'Tabbouleh salata', 'Shawarma box', 'Pita sa sirom', 'Kofta cevapi', 'Pomfrit', 'Baba ganoush', 'Harissa sos', 'Pita hleb', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Ayran']
      WHEN target.category_slug = 'indian' THEN ARRAY['Chicken biryani', 'Butter chicken', 'Chicken tikka masala', 'Palak paneer', 'Veg curry', 'Lamb curry', 'Dal makhani', 'Tandoori piletina', 'Naan hleb', 'Samosa', 'Raita', 'Mango chutney', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Mango lassi']
      ELSE ARRAY['Pileci sendvic', 'Tost sa sirom', 'Club sandwich', 'Tortilja sa piletinom', 'Hot dog', 'Cevapi u lepinji', 'Pizza parce', 'Burrito', 'Pomfrit', 'Onion rings', 'Kecap', 'Majonez', 'Coca-Cola 0.5l', 'Voda 0.5l', 'Limonada']
    END
  ) WITH ORDINALITY AS item(name, position)
), product_input AS (
  SELECT
    menu.restaurant_id,
    CASE WHEN menu.position <= 8 THEN 'Glavna jela' WHEN menu.position <= 12 THEN 'Dodaci' ELSE 'Pice' END AS category_name,
    menu.name,
    'Voro test meni: ' || menu.name || '.' AS description,
    (
      CASE
        WHEN menu.position BETWEEN 13 AND 15 THEN 150 + ((menu.position - 13) * 70)
        WHEN menu.position BETWEEN 9 AND 12 THEN 240 + ((menu.position - 9) * 80)
        WHEN menu.category_slug = 'sushi' THEN 790 + (menu.position * 110)
        WHEN menu.category_slug IN ('desserts', 'pancakes', 'breakfast') THEN 390 + (menu.position * 60)
        WHEN menu.category_slug IN ('healthy', 'vegan') THEN 590 + (menu.position * 70)
        WHEN menu.category_slug IN ('asian', 'chinese', 'mexican', 'indian', 'middle-eastern') THEN 650 + (menu.position * 85)
        ELSE 590 + (menu.position * 85)
      END + ((menu.restaurant_id % 5) * 20)
    )::NUMERIC(10, 2) AS price
  FROM menu_items menu
)
INSERT INTO product (restaurant_id, category_id, name, description, price, is_available)
SELECT input.restaurant_id, category.id, input.name, input.description, input.price, TRUE
FROM product_input input
INNER JOIN product_category category ON category.restaurant_id = input.restaurant_id AND category.name = input.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM product existing
  WHERE existing.restaurant_id = input.restaurant_id AND existing.name = input.name
);

DROP TABLE IF EXISTS voro_extra_restaurant_import;

COMMIT;
