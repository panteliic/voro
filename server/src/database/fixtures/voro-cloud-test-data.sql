-- Voro cloud test data
-- Run this entire file once in Supabase Dashboard -> SQL Editor.
-- It is idempotent: re-running it updates the same test accounts instead of
-- creating duplicates. Every account below uses password: password123

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

-- Platform administrators and customers.
INSERT INTO "user" (name, email, password, role_id, phone, email_verified, verified_at, is_active)
VALUES
  ('Voro Administrator', 'admin@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 4, '+38160111221', TRUE, NOW(), TRUE),
  ('Milena Stojanovic', 'milena.stojanovic@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 4, '+38160111222', TRUE, NOW(), TRUE),
  ('Jelena Nikolic', 'jelena.nikolic@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 1, '+38160111223', TRUE, NOW(), TRUE),
  ('Stefan Radovic', 'stefan.radovic@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 1, '+38160111224', TRUE, NOW(), TRUE),
  ('Marija Pavlovic', 'marija.pavlovic@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 1, '+38160111225', TRUE, NOW(), TRUE),
  ('Ivan Jovanovic', 'ivan.jovanovic@voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 1, '+38160111226', TRUE, NOW(), TRUE),
  ('Nikola Milosevic', 'nikola.milosevic@driver.voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 3, '+38160111227', TRUE, NOW(), TRUE),
  ('Andrej Kovacevic', 'andrej.kovacevic@driver.voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 3, '+38160111228', TRUE, NOW(), TRUE),
  ('Petar Ivanovic', 'petar.ivanovic@driver.voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 3, '+38160111229', TRUE, NOW(), TRUE),
  ('Tamara Markovic', 'tamara.markovic@driver.voro.test', '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi', 3, '+38160111230', TRUE, NOW(), TRUE)
ON CONFLICT ((LOWER(email))) DO UPDATE
SET name = EXCLUDED.name,
    password = EXCLUDED.password,
    role_id = EXCLUDED.role_id,
    phone = EXCLUDED.phone,
    email_verified = TRUE,
    verified_at = NOW(),
    is_active = TRUE,
    updated_at = NOW();

WITH restaurant_input (category_slug, name, description, phone, email, address, latitude, longitude) AS (
  VALUES
    ('serbian', 'Dunav Kitchen', 'Domaca kuhinja i rostilj.', '+38160111301', 'dunav.kitchen@voro.test', 'Karadjordjeva 41, Beograd', 44.8126000::NUMERIC, 20.4269000::NUMERIC),
    ('burgers', 'Bite Burger House', 'Burgeri, pomfrit i sosovi.', '+38160111302', 'bite.burger@voro.test', 'Kralja Milana 28, Beograd', 44.8020000::NUMERIC, 20.4650000::NUMERIC),
    ('italian', 'Trattoria Verde', 'Pasta, pizza i italijanski specijaliteti.', '+38160111303', 'trattoria.verde@voro.test', 'Njegoseva 19, Beograd', 44.7921000::NUMERIC, 20.4490000::NUMERIC)
)
INSERT INTO restaurant (category_id, name, description, phone, email, address, latitude, longitude, is_active, is_accepting_orders, preparation_minutes)
SELECT category.id, input.name, input.description, input.phone, input.email, input.address, input.latitude, input.longitude, TRUE, TRUE, 20
FROM restaurant_input input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE NOT EXISTS (SELECT 1 FROM restaurant existing WHERE LOWER(existing.email) = LOWER(input.email));

WITH restaurant_input (category_slug, name, description, phone, email, address, latitude, longitude) AS (
  VALUES
    ('serbian', 'Dunav Kitchen', 'Domaca kuhinja i rostilj.', '+38160111301', 'dunav.kitchen@voro.test', 'Karadjordjeva 41, Beograd', 44.8126000::NUMERIC, 20.4269000::NUMERIC),
    ('burgers', 'Bite Burger House', 'Burgeri, pomfrit i sosovi.', '+38160111302', 'bite.burger@voro.test', 'Kralja Milana 28, Beograd', 44.8020000::NUMERIC, 20.4650000::NUMERIC),
    ('italian', 'Trattoria Verde', 'Pasta, pizza i italijanski specijaliteti.', '+38160111303', 'trattoria.verde@voro.test', 'Njegoseva 19, Beograd', 44.7921000::NUMERIC, 20.4490000::NUMERIC)
)
UPDATE restaurant
SET category_id = category.id,
    name = input.name,
    description = input.description,
    phone = input.phone,
    address = input.address,
    latitude = input.latitude,
    longitude = input.longitude,
    is_active = TRUE,
    is_accepting_orders = TRUE,
    preparation_minutes = 20,
    updated_at = NOW()
FROM restaurant_input input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE LOWER(restaurant.email) = LOWER(input.email);

INSERT INTO restaurant_user (restaurant_id, name, email, password, access_role, is_active, email_verified)
SELECT restaurant.id, input.name, input.email,
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  'manager', TRUE, TRUE
FROM (VALUES
  ('Dunav Kitchen', 'manager.dunav@voro.test', 'Vladimir Simic'),
  ('Bite Burger House', 'manager.bite@voro.test', 'Katarina Ilic'),
  ('Trattoria Verde', 'manager.verde@voro.test', 'Luka Petrovic')
) AS input(restaurant_name, email, name)
INNER JOIN restaurant ON restaurant.name = input.restaurant_name
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
FROM (VALUES
  ('dunav.kitchen@voro.test', 'serbian'),
  ('dunav.kitchen@voro.test', 'fast-food'),
  ('bite.burger@voro.test', 'burgers'),
  ('bite.burger@voro.test', 'american'),
  ('trattoria.verde@voro.test', 'italian'),
  ('trattoria.verde@voro.test', 'pizza')
) AS input(restaurant_email, category_slug)
INNER JOIN restaurant ON restaurant.email = input.restaurant_email
INNER JOIN restaurant_category category ON category.slug = input.category_slug
ON CONFLICT DO NOTHING;

INSERT INTO product_category (restaurant_id, name, description)
SELECT restaurant.id, input.name, input.description
FROM (VALUES
  ('dunav.kitchen@voro.test', 'Rostilj', 'Jela sa rostilja'),
  ('bite.burger@voro.test', 'Burgeri', 'Burgeri i prilozi'),
  ('trattoria.verde@voro.test', 'Pasta', 'Sveze paste')
) AS input(restaurant_email, name, description)
INNER JOIN restaurant ON restaurant.email = input.restaurant_email
ON CONFLICT (restaurant_id, name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = NOW();

WITH product_input (restaurant_email, category_name, name, description, price) AS (
  VALUES
    ('dunav.kitchen@voro.test', 'Rostilj', 'Cevapi u lepinji', 'Deset cevapa, lepinja i luk.', 790.00::NUMERIC),
    ('dunav.kitchen@voro.test', 'Rostilj', 'Pileci file', 'Grilovani pileci file sa prilogom.', 840.00::NUMERIC),
    ('dunav.kitchen@voro.test', 'Rostilj', 'Gurmanska pljeskavica', 'Pljeskavica sa sirom i prilogom.', 860.00::NUMERIC),
    ('bite.burger@voro.test', 'Burgeri', 'Classic burger', 'Juneci burger, sir i sos.', 950.00::NUMERIC),
    ('bite.burger@voro.test', 'Burgeri', 'Dupli burger', 'Dva juneca mesa i cheddar.', 1190.00::NUMERIC),
    ('bite.burger@voro.test', 'Burgeri', 'Pomfrit sa sirom', 'Hrskavi pomfrit i cheddar sos.', 390.00::NUMERIC),
    ('trattoria.verde@voro.test', 'Pasta', 'Penne arrabbiata', 'Penne u pikantnom paradajz sosu.', 850.00::NUMERIC),
    ('trattoria.verde@voro.test', 'Pasta', 'Pasta carbonara', 'Pasta sa pancetom i parmezanom.', 990.00::NUMERIC),
    ('trattoria.verde@voro.test', 'Pasta', 'Tagliatelle pollo', 'Tagliatelle sa piletinom.', 1040.00::NUMERIC)
)
INSERT INTO product (restaurant_id, category_id, name, description, price, is_available)
SELECT restaurant.id, category.id, input.name, input.description, input.price, TRUE
FROM product_input input
INNER JOIN restaurant ON restaurant.email = input.restaurant_email
INNER JOIN product_category category ON category.restaurant_id = restaurant.id AND category.name = input.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM product existing WHERE existing.restaurant_id = restaurant.id AND existing.name = input.name
);

-- A large but realistic-looking catalogue for browsing and ordering tests.
-- These are regular `voro.test` test records, not development seed records.
-- It creates 60 additional restaurants (63 total with the three above) and
-- fifteen menu items for every listed restaurant.
CREATE TEMP TABLE voro_bulk_restaurant (
  position INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  secondary_category_slug TEXT NOT NULL,
  description TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO voro_bulk_restaurant (position, name, category_slug, secondary_category_slug, description)
VALUES
  (1, 'Picerija Dunav', 'pizza', 'italian', 'Pice iz centra Beograda, pripremljene po porudzbini.'),
  (2, 'Italiana Vracar', 'italian', 'pasta', 'Italijanska kuhinja, pasta i topla predjela.'),
  (3, 'Testenina 21', 'pasta', 'italian', 'Sveze testenine i sosovi za svaki ukus.'),
  (4, 'Pizza Kruna', 'pizza', 'fast-food', 'Klasicne i moderne pice za celu ekipu.'),
  (5, 'La Casa Pasta', 'pasta', 'italian', 'Pasta, rizoto i italijanski specijaliteti.'),
  (6, 'Napoli Express', 'pizza', 'italian', 'Brza napolitanska pizza sa kvalitetnim sastojcima.'),
  (7, 'Smash Corner', 'burgers', 'american', 'Smash burgeri, pomfrit i domaci sosovi.'),
  (8, 'Burger Republika', 'burgers', 'american', 'Juneci burgeri i hrskavi prilozi.'),
  (9, 'Grill and Bun', 'burgers', 'fast-food', 'Burgeri i sendvici za brzu dostavu.'),
  (10, 'Street Bite', 'fast-food', 'burgers', 'Ulicna hrana, tortilje i brzi zalogaji.'),
  (11, 'Rostilj 011', 'serbian', 'fast-food', 'Domaci rostilj i leskovacki ukusi.'),
  (12, 'Chicken District', 'chicken', 'fast-food', 'Pohovana piletina, krilca i wrapovi.'),
  (13, 'Zeleni Rostilj', 'serbian', 'healthy', 'Rostilj sa sveziim prilozima i salatama.'),
  (14, 'Leskovacki Kutak', 'serbian', 'fast-food', 'Juznjacki rostilj i domaci specijaliteti.'),
  (15, 'Daska i Meso', 'serbian', 'american', 'Odresci, rostilj i obilne porcije.'),
  (16, 'Cevap Kuca', 'serbian', 'fast-food', 'Cevapi, pljeskavice i domaca lepinja.'),
  (17, 'Wok Station', 'asian', 'chinese', 'Wok jela, nudle i azijski sosovi.'),
  (18, 'Asian Bowl', 'asian', 'healthy', 'Azijske cinije, rice bowl i lagana jela.'),
  (19, 'Kina Garden', 'chinese', 'asian', 'Kineski specijaliteti za svaki dan.'),
  (20, 'Noodle Lab', 'chinese', 'asian', 'Nudle, wok i ljuti azijski ukusi.'),
  (21, 'Tokyo Roll', 'sushi', 'asian', 'Sushi rolne, nigiri i miso supa.'),
  (22, 'Sushi Studio', 'sushi', 'asian', 'Sveze pripremljen sushi i japanski zalogaji.'),
  (23, 'Maki House', 'sushi', 'asian', 'Maki rolne i kombinovani sushi setovi.'),
  (24, 'Ramen Corner', 'asian', 'sushi', 'Topli ramen, nudle i japanska kuhinja.'),
  (25, 'Burrito Barrio', 'mexican', 'fast-food', 'Burrito, taco i meksicki street food.'),
  (26, 'Taco Plaza', 'mexican', 'fast-food', 'Taco specijaliteti, nachos i salsa.'),
  (27, 'Quesadilla House', 'mexican', 'fast-food', 'Quesadille i pikantni meksicki obroci.'),
  (28, 'Mexicano 24', 'mexican', 'fast-food', 'Meksicka kuhinja dostupna do kasno.'),
  (29, 'Green Bowl', 'healthy', 'vegan', 'Salate, bowl obroci i svezi sastojci.'),
  (30, 'Fresh and Fit', 'healthy', 'breakfast', 'Laki obroci za aktivan dan.'),
  (31, 'Salata Plus', 'healthy', 'vegan', 'Velike salate, proteini i zdravi prilozi.'),
  (32, 'Veganski Sto', 'vegan', 'healthy', 'Biljna kuhinja i veganski klasici.'),
  (33, 'Leaf Kitchen', 'vegan', 'healthy', 'Biljni obroci i sezonsko povrce.'),
  (34, 'Plant Power', 'vegan', 'healthy', 'Vegan burgeri, bowl obroci i deserti.'),
  (35, 'Slatka Kuca', 'desserts', 'pancakes', 'Kolaci, palacinke i slatki zalogaji.'),
  (36, 'Kolac Lab', 'desserts', 'pancakes', 'Moderne torte i domaci kolaci.'),
  (37, 'Donut Corner', 'desserts', 'breakfast', 'Krofne, milksejkovi i slatki dorucak.'),
  (38, 'Pancake Story', 'pancakes', 'desserts', 'Slatke i slane palacinke za sve ukuse.'),
  (39, 'Jutro Cafe', 'breakfast', 'healthy', 'Dorucak, kafa i lagani obroci.'),
  (40, 'Brunch House', 'breakfast', 'healthy', 'Brunch meni, omleti i tostovi.'),
  (41, 'Omlet Bar', 'breakfast', 'healthy', 'Jaja, omleti i dorucak tokom celog dana.'),
  (42, 'Pekara i Dorucak', 'breakfast', 'fast-food', 'Peciva, sendvici i jutarnji zalogaji.'),
  (43, 'Gyros Corner', 'gyros', 'fast-food', 'Grcki giros, feta i domaci tzatziki.'),
  (44, 'Grcki Tanjir', 'gyros', 'healthy', 'Grcki specijaliteti i mediteranski ukusi.'),
  (45, 'Shawarma Hub', 'middle-eastern', 'fast-food', 'Shawarma, kebab i arapski specijaliteti.'),
  (46, 'Falafel Garden', 'middle-eastern', 'vegan', 'Falafel, humus i biljni bliskoistocni obroci.'),
  (47, 'Biryani Box', 'indian', 'asian', 'Indijski pirinac, curry i naan hleb.'),
  (48, 'Curry House', 'indian', 'asian', 'Aromaticni indijski curry i tandoori jela.'),
  (49, 'Balkan Meso', 'serbian', 'fast-food', 'Balkanski rostilj i domaca kuhinja.'),
  (50, 'Domaca Trpeza', 'serbian', 'breakfast', 'Sarme, corbe i domaci rucak.'),
  (51, 'Kafana Kod Mosta', 'serbian', 'breakfast', 'Kafanska jela i tradicionalni ukusi.'),
  (52, 'Sarma i Supa', 'serbian', 'healthy', 'Kuvana jela i domace supe.'),
  (53, 'Sendvic Bar', 'fast-food', 'breakfast', 'Tostirani sendvici, tortilje i salate.'),
  (54, 'Wrap Works', 'fast-food', 'chicken', 'Wrapovi, piletina i brzi obroci.'),
  (55, 'Hot Dog Garage', 'fast-food', 'american', 'Hot dog, burgeri i street food.'),
  (56, 'Pomfrit Kralj', 'fast-food', 'burgers', 'Hrskavi pomfrit, sosevi i snack obroci.'),
  (57, 'Morski Tanjir', 'sushi', 'healthy', 'Riba, sushi i lagani morski obroci.'),
  (58, 'Seafood Point', 'sushi', 'asian', 'Morski plodovi i japanski specijaliteti.'),
  (59, 'Balkan Sweets', 'desserts', 'pancakes', 'Palacinke, kolaci i tradicionalni deserti.'),
  (60, 'Zdravi Zalogaj', 'healthy', 'vegan', 'Svezi, zdravi i dobro izbalansirani obroci.');

INSERT INTO restaurant (
  category_id, name, description, phone, email, address, latitude, longitude,
  is_active, is_accepting_orders, preparation_minutes, delivery_radius_km
)
SELECT
  category.id,
  input.name,
  input.description,
  '+381641' || LPAD(input.position::TEXT, 6, '0'),
  'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
  'Voro lokacija ' || input.position || ', Beograd',
  (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
  (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
  TRUE, TRUE, 20 + (input.position % 3) * 5, 8.00
FROM voro_bulk_restaurant input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM restaurant existing
  WHERE LOWER(existing.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test')
);

UPDATE restaurant
SET
  category_id = category.id,
  name = input.name,
  description = input.description,
  phone = '+381641' || LPAD(input.position::TEXT, 6, '0'),
  address = 'Voro lokacija ' || input.position || ', Beograd',
  latitude = (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
  longitude = (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
  is_active = TRUE,
  is_accepting_orders = TRUE,
  preparation_minutes = 20 + (input.position % 3) * 5,
  delivery_radius_km = 8.00,
  updated_at = NOW()
FROM voro_bulk_restaurant input
INNER JOIN restaurant_category category ON category.slug = input.category_slug
WHERE LOWER(restaurant.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test');

INSERT INTO restaurant_user (restaurant_id, name, email, password, access_role, is_active, email_verified)
SELECT
  restaurant.id,
  'Menadzer ' || LPAD(input.position::TEXT, 2, '0'),
  'manager.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  'manager', TRUE, TRUE
FROM voro_bulk_restaurant input
INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  restaurant_id = EXCLUDED.restaurant_id,
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  access_role = 'manager',
  is_active = TRUE,
  email_verified = TRUE,
  updated_at = NOW();

INSERT INTO restaurant_category_map (restaurant_id, category_id)
SELECT restaurant.id, category.id
FROM voro_bulk_restaurant input
INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
INNER JOIN restaurant_category category ON category.slug IN (input.category_slug, input.secondary_category_slug)
ON CONFLICT DO NOTHING;

WITH target_restaurants AS (
  SELECT restaurant.id, restaurant.email
  FROM restaurant
  WHERE restaurant.email IN ('dunav.kitchen@voro.test', 'bite.burger@voro.test', 'trattoria.verde@voro.test')
     OR restaurant.email LIKE 'restoran.%@voro.test'
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
  SELECT restaurant.id, restaurant.email, COALESCE(category.slug, 'fast-food') AS category_slug
  FROM restaurant
  LEFT JOIN restaurant_category category ON category.id = restaurant.category_id
  WHERE restaurant.email IN ('dunav.kitchen@voro.test', 'bite.burger@voro.test', 'trattoria.verde@voro.test')
     OR restaurant.email LIKE 'restoran.%@voro.test'
), menu_items AS (
  SELECT
    target.id AS restaurant_id,
    target.category_slug,
    item.name,
    item.position::INTEGER AS position
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
    CASE
      WHEN menu.position <= 8 THEN 'Glavna jela'
      WHEN menu.position <= 12 THEN 'Dodaci'
      ELSE 'Pice'
    END AS category_name,
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
INNER JOIN product_category category
  ON category.restaurant_id = input.restaurant_id AND category.name = input.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM product existing
  WHERE existing.restaurant_id = input.restaurant_id
    AND existing.name = input.name
);

WITH address_input (email, label, street, apartment, latitude, longitude) AS (
  VALUES
    ('jelena.nikolic@voro.test', 'Stan', 'Bulevar kralja Aleksandra 152', '12', 44.8185000::NUMERIC, 20.4554000::NUMERIC),
    ('stefan.radovic@voro.test', 'Stan', 'Kneza Milosa 36', '7', 44.8031000::NUMERIC, 20.4631000::NUMERIC),
    ('marija.pavlovic@voro.test', 'Kuca', 'Gospodar Jovanova 44', NULL, 44.8164000::NUMERIC, 20.4588000::NUMERIC),
    ('ivan.jovanovic@voro.test', 'Stan', 'Vojvode Stepe 114', '21', 44.7796000::NUMERIC, 20.4732000::NUMERIC)
)
INSERT INTO address (user_id, label, street, apartment, city, postal_code, country, latitude, longitude, delivery_instructions, is_default)
SELECT "user".id, input.label, input.street, input.apartment, 'Beograd', '11000', 'Srbija', input.latitude, input.longitude, 'Pozvati na telefon po dolasku.', TRUE
FROM address_input input
INNER JOIN "user" ON "user".email = input.email
WHERE NOT EXISTS (SELECT 1 FROM address existing WHERE existing.user_id = "user".id AND existing.label = input.label);

WITH address_input (email, label, street, apartment, latitude, longitude) AS (
  VALUES
    ('jelena.nikolic@voro.test', 'Stan', 'Bulevar kralja Aleksandra 152', '12', 44.8185000::NUMERIC, 20.4554000::NUMERIC),
    ('stefan.radovic@voro.test', 'Stan', 'Kneza Milosa 36', '7', 44.8031000::NUMERIC, 20.4631000::NUMERIC),
    ('marija.pavlovic@voro.test', 'Kuca', 'Gospodar Jovanova 44', NULL, 44.8164000::NUMERIC, 20.4588000::NUMERIC),
    ('ivan.jovanovic@voro.test', 'Stan', 'Vojvode Stepe 114', '21', 44.7796000::NUMERIC, 20.4732000::NUMERIC)
)
UPDATE address
SET street = input.street,
    apartment = input.apartment,
    latitude = input.latitude,
    longitude = input.longitude,
    delivery_instructions = 'Pozvati na telefon po dolasku.',
    is_default = TRUE,
    updated_at = NOW()
FROM address_input input
INNER JOIN "user" ON "user".email = input.email
WHERE address.user_id = "user".id AND address.label = input.label;

INSERT INTO customer_preferences (user_id, delivery_handoff, courier_notes, order_status_notifications, courier_message_notifications)
SELECT "user".id, 'leave_at_door', 'Pozvati kada ste ispred ulaza.', TRUE, TRUE
FROM "user"
WHERE "user".email IN ('jelena.nikolic@voro.test', 'stefan.radovic@voro.test', 'marija.pavlovic@voro.test', 'ivan.jovanovic@voro.test')
ON CONFLICT (user_id) DO UPDATE
SET delivery_handoff = EXCLUDED.delivery_handoff,
    courier_notes = EXCLUDED.courier_notes,
    order_status_notifications = TRUE,
    courier_message_notifications = TRUE,
    updated_at = NOW();

WITH courier_input (email, phone, vehicle_type, latitude, longitude, location_address) AS (
  VALUES
    ('nikola.milosevic@driver.voro.test', '+38160111227', 'Bicycle', 44.8144000::NUMERIC, 20.4399000::NUMERIC, 'Karadjordjeva, Beograd'),
    ('andrej.kovacevic@driver.voro.test', '+38160111228', 'Scooter', 44.8078000::NUMERIC, 20.4583000::NUMERIC, 'Terazije, Beograd'),
    ('petar.ivanovic@driver.voro.test', '+38160111229', 'Car', 44.7991000::NUMERIC, 20.4498000::NUMERIC, 'Slavija, Beograd'),
    ('tamara.markovic@driver.voro.test', '+38160111230', 'Bicycle', 44.8104000::NUMERIC, 20.4685000::NUMERIC, 'Tasmajdan, Beograd')
)
INSERT INTO courier (user_id, phone, vehicle_type, is_available, is_online, current_latitude, current_longitude, last_location_at, last_location_address, last_location_address_latitude, last_location_address_longitude, last_location_address_at)
SELECT "user".id, input.phone, input.vehicle_type, TRUE, TRUE, input.latitude, input.longitude, NOW(), input.location_address, input.latitude, input.longitude, NOW()
FROM courier_input input
INNER JOIN "user" ON "user".email = input.email
ON CONFLICT (user_id) DO UPDATE
SET phone = EXCLUDED.phone,
    vehicle_type = EXCLUDED.vehicle_type,
    is_available = TRUE,
    is_online = TRUE,
    current_latitude = EXCLUDED.current_latitude,
    current_longitude = EXCLUDED.current_longitude,
    last_location_at = NOW(),
    last_location_address = EXCLUDED.last_location_address,
    last_location_address_latitude = EXCLUDED.last_location_address_latitude,
    last_location_address_longitude = EXCLUDED.last_location_address_longitude,
    last_location_address_at = NOW(),
    updated_at = NOW();

INSERT INTO courier_work_session (courier_id, started_at)
SELECT courier.id, NOW() - INTERVAL '2 hours'
FROM courier
INNER JOIN "user" ON "user".id = courier.user_id
WHERE "user".email IN ('nikola.milosevic@driver.voro.test', 'andrej.kovacevic@driver.voro.test', 'petar.ivanovic@driver.voro.test', 'tamara.markovic@driver.voro.test')
  AND NOT EXISTS (SELECT 1 FROM courier_work_session existing WHERE existing.courier_id = courier.id AND existing.ended_at IS NULL);

WITH order_input (order_key, customer_email, restaurant_email, address_label, status_name, created_offset_minutes) AS (
  VALUES
    ('001', 'jelena.nikolic@voro.test', 'dunav.kitchen@voro.test', 'Stan', 'pending', 5),
    ('002', 'stefan.radovic@voro.test', 'bite.burger@voro.test', 'Stan', 'accepted', 18),
    ('003', 'marija.pavlovic@voro.test', 'trattoria.verde@voro.test', 'Kuca', 'preparing', 31),
    ('004', 'jelena.nikolic@voro.test', 'dunav.kitchen@voro.test', 'Stan', 'ready', 44),
    ('005', 'ivan.jovanovic@voro.test', 'bite.burger@voro.test', 'Stan', 'picked_up', 57),
    ('006', 'stefan.radovic@voro.test', 'trattoria.verde@voro.test', 'Stan', 'delivered', 95),
    ('007', 'marija.pavlovic@voro.test', 'dunav.kitchen@voro.test', 'Kuca', 'cancelled', 125)
)
INSERT INTO "order" (user_id, restaurant_id, address_id, status_id, subtotal, delivery_fee, total, note, delivery_address, delivery_instructions, delivery_latitude, delivery_longitude, created_at, updated_at)
SELECT customer.id, restaurant.id, address.id, status.id, 0, 199, 199,
  'Voro test porudzbina ' || input.order_key,
  CONCAT_WS(', ', address.street, address.apartment, address.city),
  address.delivery_instructions, address.latitude, address.longitude,
  NOW() - make_interval(mins => input.created_offset_minutes), NOW()
FROM order_input input
INNER JOIN "user" customer ON customer.email = input.customer_email
INNER JOIN restaurant ON restaurant.email = input.restaurant_email
INNER JOIN address ON address.user_id = customer.id AND address.label = input.address_label
INNER JOIN order_status status ON status.name = input.status_name
WHERE NOT EXISTS (SELECT 1 FROM "order" existing WHERE existing.note = 'Voro test porudzbina ' || input.order_key);

WITH item_input (order_key, product_name, quantity) AS (
  VALUES
    ('001', 'Cevapi u lepinji', 1),
    ('002', 'Classic burger', 1),
    ('003', 'Penne arrabbiata', 1),
    ('004', 'Gurmanska pljeskavica', 1),
    ('005', 'Dupli burger', 1),
    ('006', 'Pasta carbonara', 1),
    ('007', 'Pileci file', 1)
)
INSERT INTO order_item (order_id, product_id, product_name, quantity, unit_price, total_price, note)
SELECT "order".id, product.id, product.name, input.quantity, product.price, product.price * input.quantity, 'Voro test stavka'
FROM item_input input
INNER JOIN "order" ON "order".note = 'Voro test porudzbina ' || input.order_key
INNER JOIN product ON product.restaurant_id = "order".restaurant_id AND product.name = input.product_name
WHERE NOT EXISTS (SELECT 1 FROM order_item existing WHERE existing.order_id = "order".id AND existing.product_id = product.id);

UPDATE "order"
SET subtotal = totals.subtotal,
    total = totals.subtotal + "order".delivery_fee - "order".discount_amount + "order".tip_amount,
    updated_at = NOW()
FROM (
  SELECT order_id, SUM(total_price) AS subtotal
  FROM order_item
  GROUP BY order_id
) totals
WHERE totals.order_id = "order".id
  AND "order".note LIKE 'Voro test porudzbina %';

WITH delivery_input (order_key, courier_email, delivery_status) AS (
  VALUES
    ('002', 'nikola.milosevic@driver.voro.test', 'assigned'),
    ('003', 'andrej.kovacevic@driver.voro.test', 'arriving_to_restaurant'),
    ('004', 'nikola.milosevic@driver.voro.test', 'arriving_to_restaurant'),
    ('005', 'petar.ivanovic@driver.voro.test', 'picked_up'),
    ('006', 'tamara.markovic@driver.voro.test', 'delivered'),
    ('007', 'andrej.kovacevic@driver.voro.test', 'cancelled')
)
INSERT INTO delivery (order_id, courier_id, status_id, pickup_code, picked_up_at, delivered_at)
SELECT "order".id, courier.id, status.id, LPAD(("order".id % 1000000)::TEXT, 6, '0'),
  CASE WHEN status.name IN ('picked_up', 'delivered') THEN "order".created_at + INTERVAL '20 minutes' END,
  CASE WHEN status.name = 'delivered' THEN "order".created_at + INTERVAL '43 minutes' END
FROM delivery_input input
INNER JOIN "order" ON "order".note = 'Voro test porudzbina ' || input.order_key
INNER JOIN "user" courier_user ON courier_user.email = input.courier_email
INNER JOIN courier ON courier.user_id = courier_user.id
INNER JOIN delivery_status status ON status.name = input.delivery_status
ON CONFLICT (order_id) DO UPDATE
SET courier_id = EXCLUDED.courier_id,
    status_id = EXCLUDED.status_id,
    pickup_code = EXCLUDED.pickup_code,
    picked_up_at = EXCLUDED.picked_up_at,
    delivered_at = EXCLUDED.delivered_at,
    updated_at = NOW();

INSERT INTO delivery_dispatch_job (order_id, status, attempts, assigned_courier_id, next_attempt_at)
SELECT "order".id, 'assigned', 1, courier.id, NOW()
FROM "order"
INNER JOIN "user" courier_user ON courier_user.email = 'nikola.milosevic@driver.voro.test'
INNER JOIN courier ON courier.user_id = courier_user.id
WHERE "order".note = 'Voro test porudzbina 004'
ON CONFLICT (order_id) DO UPDATE
SET status = 'assigned',
    attempts = 1,
    assigned_courier_id = EXCLUDED.assigned_courier_id,
    next_attempt_at = NOW(),
    updated_at = NOW();

INSERT INTO delivery_dispatch_offer (dispatch_job_id, order_id, courier_id, status, expires_at)
SELECT job.id, "order".id, courier.id, 'accepted', NOW() + INTERVAL '15 minutes'
FROM delivery_dispatch_job job
INNER JOIN "order" ON "order".id = job.order_id
INNER JOIN "user" courier_user ON courier_user.email = 'nikola.milosevic@driver.voro.test'
INNER JOIN courier ON courier.user_id = courier_user.id
WHERE "order".note = 'Voro test porudzbina 004'
ON CONFLICT (order_id, courier_id) DO UPDATE
SET status = 'accepted',
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

INSERT INTO delivery_location (delivery_id, courier_id, latitude, longitude, recorded_at)
SELECT delivery.id, delivery.courier_id,
  COALESCE(courier.current_latitude, 44.8100000), COALESCE(courier.current_longitude, 20.4500000), NOW() - INTERVAL '2 minutes'
FROM delivery
INNER JOIN "order" ON "order".id = delivery.order_id
INNER JOIN courier ON courier.id = delivery.courier_id
WHERE "order".note IN ('Voro test porudzbina 005', 'Voro test porudzbina 006')
  AND NOT EXISTS (SELECT 1 FROM delivery_location existing WHERE existing.delivery_id = delivery.id);

INSERT INTO delivery_event (delivery_id, order_id, courier_id, actor_user_id, event_type, reason, metadata)
SELECT delivery.id, delivery.order_id, delivery.courier_id, courier.user_id,
  CASE delivery_status.name
    WHEN 'assigned' THEN 'assigned'
    WHEN 'picked_up' THEN 'picked_up'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'cancelled' THEN 'driver_withdrew'
    ELSE 'assigned'
  END,
  'Voro test dogadjaj', jsonb_build_object('source', 'cloud-test-fixture')
FROM delivery
INNER JOIN "order" ON "order".id = delivery.order_id
INNER JOIN courier ON courier.id = delivery.courier_id
INNER JOIN delivery_status ON delivery_status.id = delivery.status_id
WHERE "order".note LIKE 'Voro test porudzbina %'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_event existing
    WHERE existing.delivery_id = delivery.id
      AND existing.event_type = CASE delivery_status.name
        WHEN 'assigned' THEN 'assigned'
        WHEN 'picked_up' THEN 'picked_up'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'cancelled' THEN 'driver_withdrew'
        ELSE 'assigned'
      END
  );

INSERT INTO payment (order_id, amount, method, status, transaction_reference, paid_at, cash_tendered, change_due)
SELECT "order".id, "order".total, 'cash',
  CASE WHEN status.name = 'delivered' THEN 'paid' ELSE 'pending' END,
  'VORO-CASH-' || "order".id,
  CASE WHEN status.name = 'delivered' THEN NOW() ELSE NULL END,
  CASE WHEN status.name = 'delivered' THEN "order".total ELSE NULL END, 0
FROM "order"
INNER JOIN order_status status ON status.id = "order".status_id
WHERE "order".note LIKE 'Voro test porudzbina %'
ON CONFLICT (order_id) DO UPDATE
SET amount = EXCLUDED.amount,
    method = EXCLUDED.method,
    status = EXCLUDED.status,
    transaction_reference = EXCLUDED.transaction_reference,
    paid_at = EXCLUDED.paid_at,
    cash_tendered = EXCLUDED.cash_tendered,
    change_due = EXCLUDED.change_due,
    updated_at = NOW();

INSERT INTO promotion_code (restaurant_id, code, description, discount_type, discount_value, minimum_order, max_redemptions, redemptions, is_active)
SELECT restaurant.id, 'DOBRODOSLI20', 'Popust za test porudzbine.', 'fixed', 150, 500, 100, 1, TRUE
FROM restaurant WHERE restaurant.email = 'trattoria.verde@voro.test'
ON CONFLICT (code) DO UPDATE
SET restaurant_id = EXCLUDED.restaurant_id,
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    minimum_order = EXCLUDED.minimum_order,
    is_active = TRUE,
    updated_at = NOW();

UPDATE "order"
SET discount_amount = 150,
    promotion_code = 'DOBRODOSLI20',
    total = subtotal + delivery_fee - 150 + tip_amount,
    updated_at = NOW()
WHERE note = 'Voro test porudzbina 006';

INSERT INTO promotion_redemption (promotion_code_id, user_id, order_id, discount_amount)
SELECT promotion.id, "user".id, "order".id, 150
FROM promotion_code promotion
INNER JOIN "order" ON "order".note = 'Voro test porudzbina 006'
INNER JOIN "user" ON "user".id = "order".user_id
WHERE promotion.code = 'DOBRODOSLI20'
ON CONFLICT (order_id) DO UPDATE SET discount_amount = EXCLUDED.discount_amount;

INSERT INTO referral_code (user_id, code)
SELECT "user".id, 'JELENA20'
FROM "user" WHERE "user".email = 'jelena.nikolic@voro.test'
ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code;

INSERT INTO referral_redemption (referrer_user_id, referred_user_id, order_id, referral_code, discount_amount)
SELECT referrer.id, referred.id, "order".id, 'JELENA20', 100
FROM "user" referrer
INNER JOIN "user" referred ON referred.email = 'ivan.jovanovic@voro.test'
INNER JOIN "order" ON "order".note = 'Voro test porudzbina 005'
WHERE referrer.email = 'jelena.nikolic@voro.test'
ON CONFLICT (referred_user_id) DO UPDATE
SET order_id = EXCLUDED.order_id,
    referral_code = EXCLUDED.referral_code,
    discount_amount = EXCLUDED.discount_amount;

INSERT INTO restaurant_favorite (user_id, restaurant_id)
SELECT "user".id, restaurant.id
FROM "user"
INNER JOIN restaurant ON restaurant.email = 'trattoria.verde@voro.test'
WHERE "user".email = 'jelena.nikolic@voro.test'
ON CONFLICT DO NOTHING;

INSERT INTO order_review (order_id, user_id, restaurant_id, rating, comment)
SELECT "order".id, "order".user_id, "order".restaurant_id, 5, 'Odlicna pasta i brza dostava.'
FROM "order"
WHERE "order".note = 'Voro test porudzbina 006'
ON CONFLICT (order_id) DO UPDATE
SET rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    updated_at = NOW();

INSERT INTO order_issue (order_id, reporter_user_id, category, description, status)
SELECT "order".id, "order".user_id, 'late_delivery', 'Test prijava za admin pregled.', 'open'
FROM "order"
WHERE "order".note = 'Voro test porudzbina 005'
  AND NOT EXISTS (SELECT 1 FROM order_issue existing WHERE existing.order_id = "order".id AND existing.description = 'Test prijava za admin pregled.');

INSERT INTO order_message (order_id, sender_user_id, sender_role, body)
SELECT "order".id, "order".user_id, 'customer', 'Molim vas javite kada ste blizu adrese.'
FROM "order"
WHERE "order".note = 'Voro test porudzbina 005'
  AND NOT EXISTS (SELECT 1 FROM order_message existing WHERE existing.order_id = "order".id AND existing.sender_role = 'customer');

INSERT INTO order_message (order_id, sender_user_id, sender_role, body)
SELECT "order".id, courier.user_id, 'courier', 'Stizem za nekoliko minuta.'
FROM "order"
INNER JOIN delivery ON delivery.order_id = "order".id
INNER JOIN courier ON courier.id = delivery.courier_id
WHERE "order".note = 'Voro test porudzbina 005'
  AND NOT EXISTS (SELECT 1 FROM order_message existing WHERE existing.order_id = "order".id AND existing.sender_role = 'courier');

INSERT INTO app_notification (recipient_user_id, type, title, body, data)
SELECT "order".user_id, 'courier_nearby', 'Kurir je blizu', 'Kurir je nekoliko minuta od vase adrese.', jsonb_build_object('orderId', "order".id)
FROM "order"
WHERE "order".note = 'Voro test porudzbina 005'
  AND NOT EXISTS (
    SELECT 1 FROM app_notification existing
    WHERE existing.recipient_user_id = "order".user_id
      AND existing.type = 'courier_nearby'
      AND existing.data ->> 'orderId' = "order".id::TEXT
  );

INSERT INTO support_ticket (user_id, order_id, category, subject, body, status)
SELECT "order".user_id, "order".id, 'delivery', 'Test podrska za porudzbinu', 'Ovo je test tiket za admin pregled.', 'open'
FROM "order"
WHERE "order".note = 'Voro test porudzbina 005'
  AND NOT EXISTS (SELECT 1 FROM support_ticket existing WHERE existing.order_id = "order".id AND existing.subject = 'Test podrska za porudzbinu');

INSERT INTO checkout_idempotency (user_id, idempotency_key, request_hash, order_id, order_response)
SELECT "order".user_id, 'voro-cloud-test-key-00000000000001', repeat('a', 64), "order".id, jsonb_build_object('orderId', "order".id, 'source', 'cloud-test-fixture')
FROM "order"
WHERE "order".note = 'Voro test porudzbina 001'
ON CONFLICT (user_id, idempotency_key) DO UPDATE
SET order_id = EXCLUDED.order_id,
    order_response = EXCLUDED.order_response,
    updated_at = NOW();

INSERT INTO dispatch_alert (order_id, severity, reason, status)
SELECT "order".id, 'warning', 'Test upozorenje za dispatch tablu.', 'open'
FROM "order"
WHERE "order".note = 'Voro test porudzbina 004'
ON CONFLICT (order_id) DO UPDATE
SET severity = EXCLUDED.severity,
    reason = EXCLUDED.reason,
    status = EXCLUDED.status,
    updated_at = NOW();

COMMIT;
