-- Development-only seed. It is executed exclusively by `npm run seed:demo`.
-- All accounts below use the bcrypt hash for the password: password123
-- Restaurant names and cuisine labels were checked against public Belgrade Wolt/Glovo listings.
-- Owner identities, contact details, prices and menu items are intentionally synthetic test data.

INSERT INTO restaurant_category (name, slug, icon, sort_order)
VALUES
  ('Pasta', 'pasta', 'pasta', 140),
  ('Indian', 'indian', 'cooking-pot', 150),
  ('Middle Eastern', 'middle-eastern', 'sandwich', 160),
  ('Gyros', 'gyros', 'wrap', 170),
  ('Pancakes', 'pancakes', 'cake-slice', 180),
  ('Chicken', 'chicken', 'drumstick', 190),
  ('American', 'american', 'beef', 200)
ON CONFLICT (name) DO UPDATE
SET
  slug = EXCLUDED.slug,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at, is_active)
VALUES (
  'Voro Demo Admin',
  'admin@seed.voro.test',
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  4,
  TRUE,
  NOW(),
  TRUE
)
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role_id = EXCLUDED.role_id,
  email_verified = TRUE,
  verified_at = NOW(),
  is_active = TRUE,
  updated_at = NOW();

CREATE TEMP TABLE demo_restaurant_seed (
  owner_name TEXT NOT NULL,
  owner_email TEXT PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  primary_category_slug TEXT NOT NULL,
  category_slugs TEXT[] NOT NULL,
  description TEXT NOT NULL,
  menu_category TEXT NOT NULL,
  item_1 TEXT NOT NULL,
  price_1 NUMERIC(10, 2) NOT NULL,
  item_2 TEXT NOT NULL,
  price_2 NUMERIC(10, 2) NOT NULL,
  item_3 TEXT NOT NULL,
  price_3 NUMERIC(10, 2) NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_restaurant_seed (
  owner_name, owner_email, restaurant_name, primary_category_slug, category_slugs,
  description, menu_category, item_1, price_1, item_2, price_2, item_3, price_3
)
VALUES
  ('Demo vlasnik 01', 'owner.majstor-margarita@seed.voro.test', 'Majstor i Margarita', 'pizza', ARRAY['pizza', 'italian'], 'Demo profil za italijansku kuhinju i pizzu.', 'Pizza', 'Margherita', 890, 'Capricciosa', 1090, 'Quattro Formaggi', 1190),
  ('Demo vlasnik 02', 'owner.pizzeria-trg@seed.voro.test', 'Pizzeria Trg', 'pizza', ARRAY['pizza', 'italian'], 'Demo profil za pizzu iz centra Beograda.', 'Pizza', 'Pizza Trg', 990, 'Pepperoni pizza', 1090, 'Vegetariana', 980),
  ('Demo vlasnik 03', 'owner.bergamo@seed.voro.test', 'Pizzeria Bergamo', 'pizza', ARRAY['pizza', 'italian'], 'Demo profil za italijansku pizzu.', 'Pizza', 'Prosciutto pizza', 1150, 'Diavola', 1120, 'Funghi pizza', 980),
  ('Demo vlasnik 04', 'owner.pizza-plus@seed.voro.test', 'Pizza Plus', 'pizza', ARRAY['pizza'], 'Demo profil za brzu dostavu pice.', 'Pizza', 'Pizza Plus Specijal', 1050, 'Tuna pizza', 1090, 'Margarita', 820),
  ('Demo vlasnik 05', 'owner.capone@seed.voro.test', 'Capone', 'pizza', ARRAY['pizza', 'italian'], 'Demo profil za pizzu i testeninu.', 'Pizza', 'Capone pizza', 1180, 'Siciliana', 1090, 'Bianca pizza', 1040),
  ('Demo vlasnik 06', 'owner.picerija-krug@seed.voro.test', 'Picerija Krug', 'pizza', ARRAY['pizza'], 'Demo profil za pizzu sa više ukusa.', 'Pizza', 'Krug pizza', 1060, 'BBQ piletina pizza', 1120, 'Vesuvio pizza', 1030),
  ('Demo vlasnik 07', 'owner.masinca@seed.voro.test', 'Pizza kod Mašinca', 'pizza', ARRAY['pizza', 'fast-food'], 'Demo profil za studentsku picu.', 'Pizza', 'Pizza kod Mašinca', 860, 'Pica parče sa kulenom', 320, 'Margarita parče', 260),
  ('Demo vlasnik 08', 'owner.bueno-pizza@seed.voro.test', 'Bueno Pizza', 'pizza', ARRAY['pizza'], 'Demo profil za picu i sendviče.', 'Pizza', 'Bueno Specijal', 1050, 'Piletina pizza', 1080, 'Pizza sa pršutom', 1150),
  ('Demo vlasnik 09', 'owner.caribic-pizza@seed.voro.test', 'Caribic Pizza', 'pizza', ARRAY['pizza', 'fast-food'], 'Demo profil za picu i brze obroke.', 'Pizza', 'Caribic Specijal', 990, 'Capricciosa', 950, 'Mexicana pizza', 1030),
  ('Demo vlasnik 10', 'owner.bigpizza@seed.voro.test', 'BigPizza', 'pizza', ARRAY['pizza'], 'Demo profil za velike pice.', 'Pizza', 'BigPizza klasika', 1190, 'BigPizza peperoni', 1290, 'BigPizza vege', 1120),
  ('Demo vlasnik 11', 'owner.madness-pizzeria@seed.voro.test', 'Madness Pizzeria', 'pizza', ARRAY['pizza'], 'Demo profil za moderne pice.', 'Pizza', 'Madness Specijal', 1140, 'Truffle pizza', 1320, 'Pesto pizza', 1180),
  ('Demo vlasnik 12', 'owner.street-pasta@seed.voro.test', 'Street Pasta bar Terazije', 'pasta', ARRAY['pasta', 'italian'], 'Demo profil za testenine.', 'Pasta', 'Penne arrabbiata', 790, 'Carbonara', 920, 'Tagliatelle pollo', 990),
  ('Demo vlasnik 13', 'owner.viva-pasta@seed.voro.test', 'Viva la Pasta', 'pasta', ARRAY['pasta', 'italian'], 'Demo profil za italijansku testeninu.', 'Pasta', 'Bolognese', 920, 'Pasta quattro formaggi', 970, 'Pasta pesto', 890),
  ('Demo vlasnik 14', 'owner.risotto-bar@seed.voro.test', 'The Risotto Bar', 'italian', ARRAY['italian', 'pasta', 'healthy'], 'Demo profil za rižoto i lakša jela.', 'Rižoto', 'Mushroom rižoto', 1090, 'Chicken rižoto', 1120, 'Pasta primavera', 940),
  ('Demo vlasnik 15', 'owner.metal-bar-pizza@seed.voro.test', 'Restaurant Metal Bar Pizza', 'pizza', ARRAY['pizza', 'italian'], 'Demo profil za pizzu i italijanska jela.', 'Pizza', 'Metal Bar pizza', 1090, 'Pizza sa povrćem', 990, 'Pasta alfredo', 980),
  ('Demo vlasnik 16', 'owner.hard-rock-cafe@seed.voro.test', 'Hard Rock Cafe', 'american', ARRAY['american', 'burgers'], 'Demo profil za američku kuhinju.', 'Burgeri', 'Classic burger', 1390, 'BBQ burger', 1490, 'Chicken wings', 1090),
  ('Demo vlasnik 17', 'owner.collina-burgers@seed.voro.test', 'Collina Burgers', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za smash burgere.', 'Burgeri', 'Collina smash burger', 990, 'Double smash burger', 1290, 'Pomfrit sa sirom', 390),
  ('Demo vlasnik 18', 'owner.smash-burgers@seed.voro.test', 'Smash Burgers', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za smash burgere.', 'Burgeri', 'Single smash burger', 850, 'Double smash burger', 1150, 'Onion rings', 390),
  ('Demo vlasnik 19', 'owner.burger-house-bros@seed.voro.test', 'Burger House Bros. Stari Grad', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za gurmanske burgere.', 'Burgeri', 'Bros classic', 1050, 'Bacon burger', 1190, 'Veggie burger', 990),
  ('Demo vlasnik 20', 'owner.flat-burger@seed.voro.test', 'Flat Burger', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za burgere iz kraja.', 'Burgeri', 'Flat classic', 880, 'Flat spicy', 950, 'Crispy chicken burger', 890),
  ('Demo vlasnik 21', 'owner.favola-smash@seed.voro.test', 'Favola Smash Burger', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za smash burgere.', 'Burgeri', 'Favola smash', 920, 'Truffle smash', 1120, 'Loaded fries', 490),
  ('Demo vlasnik 22', 'owner.chicago-burgers@seed.voro.test', 'Chicago Burgers', 'burgers', ARRAY['burgers', 'american'], 'Demo profil za američke burgere.', 'Burgeri', 'Chicago classic', 950, 'Chicago cheese', 1050, 'Chicken tenders', 750),
  ('Demo vlasnik 23', 'owner.burgeri-caribic@seed.voro.test', 'Burgeri by Caribic', 'burgers', ARRAY['burgers', 'fast-food'], 'Demo profil za burgere i brze obroke.', 'Burgeri', 'Caribic burger', 720, 'Double burger', 930, 'Pomfrit', 300),
  ('Demo vlasnik 24', 'owner.mcdonalds-bezistan@seed.voro.test', 'McDonald''s Bezistan', 'burgers', ARRAY['burgers', 'fast-food', 'american'], 'Demo profil za brzu hranu.', 'Brza hrana', 'Big burger meni', 990, 'Chicken nuggets meni', 850, 'Pomfrit veliki', 340),
  ('Demo vlasnik 25', 'owner.kfc-studentski-trg@seed.voro.test', 'KFC - Studentski Trg', 'chicken', ARRAY['chicken', 'fast-food', 'american'], 'Demo profil za pileće obroke.', 'Piletina', 'Bucket za dvoje', 1390, 'Zinger burger meni', 990, 'Hot wings', 690),
  ('Demo vlasnik 26', 'owner.red-wings-vuk@seed.voro.test', 'Red Wings Vukov Spomenik', 'chicken', ARRAY['chicken', 'fast-food'], 'Demo profil za krilca i piletinu.', 'Piletina', 'Hot wings', 790, 'Crispy strips', 850, 'Chicken wrap', 720),
  ('Demo vlasnik 27', 'owner.republika-grill@seed.voro.test', 'Republika Grill', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za domaći roštilj.', 'Roštilj', 'Pljeskavica', 650, 'Ćevapi 10 kom', 720, 'Kobasica sa kajmakom', 690),
  ('Demo vlasnik 28', 'owner.stepin-vajat@seed.voro.test', 'Stepin Vajat Bulevar', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za leskovački roštilj.', 'Roštilj', 'Leskovačka pljeskavica', 720, 'Pileće belo', 740, 'Uštipci', 590),
  ('Demo vlasnik 29', 'owner.favola-grill@seed.voro.test', 'Favola Grill', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za roštilj i domaća jela.', 'Roštilj', 'Gurmanska pljeskavica', 750, 'Ćevapi u lepinji', 690, 'Pileći file', 720),
  ('Demo vlasnik 30', 'owner.grill-51@seed.voro.test', 'Grill 51', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za klasičan roštilj.', 'Roštilj', 'Pljeskavica 51', 680, 'Dimljena vešalica', 890, 'Pomfrit', 260),
  ('Demo vlasnik 31', 'owner.zar-mance@seed.voro.test', 'Žar Mance Bulevar', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za južnjački roštilj.', 'Roštilj', 'Ćevapi', 700, 'Pileći batak', 650, 'Punjena pljeskavica', 790),
  ('Demo vlasnik 32', 'owner.rostilj-pobednik@seed.voro.test', 'Roštilj Pobednik', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za roštilj.', 'Roštilj', 'Pobednik pljeskavica', 690, 'Ćevapi 5 kom', 490, 'Kobasica', 570),
  ('Demo vlasnik 33', 'owner.sis-cevap-mig@seed.voro.test', 'Šiš ćevap MIG', 'serbian', ARRAY['serbian', 'fast-food'], 'Demo profil za ćevape i šiš.', 'Roštilj', 'Šiš ćevap', 760, 'Ćevapi 10 kom', 720, 'Pileći ražnjić', 690),
  ('Demo vlasnik 34', 'owner.pavle-korcagin@seed.voro.test', 'Pavle Korčagin', 'serbian', ARRAY['serbian', 'breakfast'], 'Demo profil za domaću kuhinju.', 'Domaća jela', 'Karađorđeva šnicla', 1190, 'Teleća čorba', 490, 'Sarma', 790),
  ('Demo vlasnik 35', 'owner.mosarpi@seed.voro.test', 'MoSarpi Beograd', 'chinese', ARRAY['chinese', 'asian'], 'Demo profil za kinesku kuhinju.', 'Kineska kuhinja', 'Piletina sa povrćem', 850, 'Prženi pirinač', 620, 'Govedina u slatko-kiselom sosu', 990),
  ('Demo vlasnik 36', 'owner.tt-asia@seed.voro.test', 'TT Asia', 'asian', ARRAY['asian', 'chinese'], 'Demo profil za azijsku kuhinju.', 'Azijska kuhinja', 'Pad thai', 1050, 'Teriyaki piletina', 990, 'Spring rolls', 550),
  ('Demo vlasnik 37', 'owner.shanghai@seed.voro.test', 'Shanghai', 'chinese', ARRAY['chinese', 'asian'], 'Demo profil za kineske specijalitete.', 'Kineska kuhinja', 'Kung pao piletina', 920, 'Nudle sa povrćem', 750, 'Wonton supa', 490),
  ('Demo vlasnik 38', 'owner.sanmao@seed.voro.test', 'SANMAO Kineski Restoran', 'chinese', ARRAY['chinese', 'asian'], 'Demo profil za kinesku dostavu.', 'Kineska kuhinja', 'Piletina sa susamom', 890, 'Pržene nudle', 730, 'Dim sum', 690),
  ('Demo vlasnik 39', 'owner.chinese-mrma@seed.voro.test', 'Chinese Mr.Ma Fried Noodles', 'chinese', ARRAY['chinese', 'asian'], 'Demo profil za nudle i wok jela.', 'Nudle', 'Fried noodles sa piletinom', 820, 'Wok povrće', 690, 'Nudle sa gamborima', 1090),
  ('Demo vlasnik 40', 'owner.sushiwave@seed.voro.test', 'SushiWave', 'sushi', ARRAY['sushi', 'asian'], 'Demo profil za sushi.', 'Sushi', 'California roll', 990, 'Salmon nigiri', 1090, 'Veggie maki', 790),
  ('Demo vlasnik 41', 'owner.fine-sushi@seed.voro.test', 'Fine Sushi', 'sushi', ARRAY['sushi', 'asian'], 'Demo profil za sushi rolne.', 'Sushi', 'Fine mix roll', 1190, 'Spicy tuna roll', 1090, 'Miso supa', 390),
  ('Demo vlasnik 42', 'owner.sushi-wok@seed.voro.test', 'Sushi Wok', 'sushi', ARRAY['sushi', 'asian'], 'Demo profil za sushi i wok.', 'Sushi', 'Sushi klasik set', 1290, 'Wok piletina', 890, 'Tempura roll', 1120),
  ('Demo vlasnik 43', 'owner.biryani-central@seed.voro.test', 'Biryani Central', 'indian', ARRAY['indian', 'asian'], 'Demo profil za indijsku kuhinju.', 'Indijska kuhinja', 'Chicken biryani', 1090, 'Butter chicken', 1190, 'Naan hleb', 220),
  ('Demo vlasnik 44', 'owner.shawarma-hanan@seed.voro.test', 'Shawarma Hanan Jerusalim', 'middle-eastern', ARRAY['middle-eastern', 'fast-food'], 'Demo profil za bliskoistočne specijalitete.', 'Shawarma', 'Chicken shawarma', 790, 'Falafel wrap', 650, 'Hummus sa lepinjom', 520),
  ('Demo vlasnik 45', 'owner.ela-giros@seed.voro.test', 'ELA GIROS & PIZZA MARKET', 'gyros', ARRAY['gyros', 'pizza', 'fast-food'], 'Demo profil za giros i pizzu.', 'Gyros', 'Pileći giros', 720, 'Svinjski giros', 750, 'Gyros salata', 490),
  ('Demo vlasnik 46', 'owner.gyros-in-city@seed.voro.test', 'Gyros in City', 'gyros', ARRAY['gyros', 'fast-food'], 'Demo profil za grčki giros.', 'Gyros', 'Classic gyros', 750, 'Gyros box', 890, 'Pomfrit sa fetom', 390),
  ('Demo vlasnik 47', 'owner.burrito-madre@seed.voro.test', 'Burrito Madre', 'mexican', ARRAY['mexican', 'fast-food'], 'Demo profil za meksičku hranu.', 'Meksička kuhinja', 'Chicken burrito', 990, 'Beef quesadilla', 1090, 'Nachos sa sirom', 590),
  ('Demo vlasnik 48', 'owner.moja-salata@seed.voro.test', 'Moja Salata Bar Dorćol', 'healthy', ARRAY['healthy', 'vegan'], 'Demo profil za salate i zdrave obroke.', 'Salate', 'Cezar salata', 890, 'Mediterranean bowl', 940, 'Fresh green salad', 690),
  ('Demo vlasnik 49', 'owner.rai-urban-vege@seed.voro.test', 'RAI Urban Vege', 'vegan', ARRAY['vegan', 'healthy'], 'Demo profil za veganske obroke.', 'Veganski meni', 'Vegan burger', 890, 'Tofu bowl', 990, 'Falafel salad', 790),
  ('Demo vlasnik 50', 'owner.domace-palacinke@seed.voro.test', 'Domaće palačinke', 'pancakes', ARRAY['pancakes', 'desserts'], 'Demo profil za slatke i slane palačinke.', 'Palačinke', 'Nutella palačinka', 540, 'Plazma palačinka', 560, 'Slana palačinka', 690);

UPDATE demo_restaurant_seed
SET
  owner_name = restaurant_name,
  owner_email = REGEXP_REPLACE(
    owner_email,
    '^owner\.(.+)@seed\.voro\.test$',
    'restaurant.\1@voro.test'
  );

INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at, is_active)
SELECT
  owner_name,
  owner_email,
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  2,
  TRUE,
  NOW(),
  TRUE
FROM demo_restaurant_seed
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role_id = 2,
  email_verified = TRUE,
  verified_at = NOW(),
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO restaurant (owner_user_id, category_id, name, description, email, is_active)
SELECT
  owner.id,
  category.id,
  seed.restaurant_name,
  seed.description,
  seed.owner_email,
  TRUE
FROM demo_restaurant_seed seed
INNER JOIN "user" owner ON owner.email = seed.owner_email
INNER JOIN restaurant_category category ON category.slug = seed.primary_category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM restaurant existing
  WHERE existing.owner_user_id = owner.id
);

INSERT INTO restaurant_category_map (restaurant_id, category_id)
SELECT restaurant.id, category.id
FROM demo_restaurant_seed seed
INNER JOIN "user" owner ON owner.email = seed.owner_email
INNER JOIN restaurant ON restaurant.owner_user_id = owner.id
CROSS JOIN LATERAL unnest(seed.category_slugs) AS selected(slug)
INNER JOIN restaurant_category category ON category.slug = selected.slug
ON CONFLICT DO NOTHING;

INSERT INTO product_category (restaurant_id, name, description)
SELECT
  restaurant.id,
  seed.menu_category,
  'Demo kategorija menija za razvojno okruženje.'
FROM demo_restaurant_seed seed
INNER JOIN "user" owner ON owner.email = seed.owner_email
INNER JOIN restaurant ON restaurant.owner_user_id = owner.id
ON CONFLICT (restaurant_id, name) DO NOTHING;

INSERT INTO product (restaurant_id, category_id, name, description, price, is_available)
SELECT
  restaurant.id,
  product_category.id,
  item.name,
  'Demo artikl za razvojno okruženje.',
  item.price,
  TRUE
FROM demo_restaurant_seed seed
INNER JOIN "user" owner ON owner.email = seed.owner_email
INNER JOIN restaurant ON restaurant.owner_user_id = owner.id
INNER JOIN product_category ON product_category.restaurant_id = restaurant.id
  AND product_category.name = seed.menu_category
CROSS JOIN LATERAL (
  VALUES
    (seed.item_1, seed.price_1),
    (seed.item_2, seed.price_2),
    (seed.item_3, seed.price_3)
) AS item(name, price)
WHERE NOT EXISTS (
  SELECT 1
  FROM product existing
  WHERE existing.restaurant_id = restaurant.id
    AND existing.name = item.name
);

CREATE TEMP TABLE demo_customer_seed (
  name TEXT NOT NULL,
  email TEXT PRIMARY KEY,
  street TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_customer_seed (name, email, street)
VALUES
  ('Ana Marković', 'customer.ana@seed.voro.test', 'Demo adresa 01'),
  ('Marko Jovanović', 'customer.marko@seed.voro.test', 'Demo adresa 02'),
  ('Milica Petrović', 'customer.milica@seed.voro.test', 'Demo adresa 03'),
  ('Nikola Ilić', 'customer.nikola@seed.voro.test', 'Demo adresa 04'),
  ('Jovana Stojanović', 'customer.jovana@seed.voro.test', 'Demo adresa 05'),
  ('Luka Nikolić', 'customer.luka@seed.voro.test', 'Demo adresa 06'),
  ('Teodora Pavlović', 'customer.teodora@seed.voro.test', 'Demo adresa 07'),
  ('Vuk Savić', 'customer.vuk@seed.voro.test', 'Demo adresa 08'),
  ('Mina Đorđević', 'customer.mina@seed.voro.test', 'Demo adresa 09'),
  ('Filip Kovačević', 'customer.filip@seed.voro.test', 'Demo adresa 10'),
  ('Sara Milošević', 'customer.sara@seed.voro.test', 'Demo adresa 11'),
  ('Stefan Popović', 'customer.stefan@seed.voro.test', 'Demo adresa 12'),
  ('Lena Ristić', 'customer.lena@seed.voro.test', 'Demo adresa 13'),
  ('Mihajlo Lazić', 'customer.mihajlo@seed.voro.test', 'Demo adresa 14'),
  ('Katarina Vasić', 'customer.katarina@seed.voro.test', 'Demo adresa 15'),
  ('Andrej Mirković', 'customer.andrej@seed.voro.test', 'Demo adresa 16'),
  ('Una Radović', 'customer.una@seed.voro.test', 'Demo adresa 17'),
  ('Ognjen Marić', 'customer.ognjen@seed.voro.test', 'Demo adresa 18'),
  ('Nina Simović', 'customer.nina@seed.voro.test', 'Demo adresa 19'),
  ('Pavle Tadić', 'customer.pavle@seed.voro.test', 'Demo adresa 20');

INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at, is_active)
SELECT
  name,
  email,
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  1,
  TRUE,
  NOW(),
  TRUE
FROM demo_customer_seed
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role_id = 1,
  email_verified = TRUE,
  verified_at = NOW(),
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO address (user_id, label, street, city, postal_code, country, is_default)
SELECT
  customer.id,
  'Kuća',
  seed.street,
  'Beograd',
  '11000',
  'Srbija',
  TRUE
FROM demo_customer_seed seed
INNER JOIN "user" customer ON customer.email = seed.email
WHERE NOT EXISTS (
  SELECT 1
  FROM address existing
  WHERE existing.user_id = customer.id AND existing.label = 'Kuća'
);

INSERT INTO customer_preferences (user_id)
SELECT customer.id
FROM demo_customer_seed seed
INNER JOIN "user" customer ON customer.email = seed.email
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE demo_driver_seed (
  name TEXT NOT NULL,
  email TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  is_available BOOLEAN NOT NULL
) ON COMMIT DROP;

INSERT INTO demo_driver_seed (name, email, phone, vehicle_type, is_available)
VALUES
  ('Marko Jovanović', 'marko.jovanovic@driver.voro.test', 'TEST-DRIVER-01', 'Bicycle', TRUE),
  ('Nikola Stanković', 'nikola.stankovic@driver.voro.test', 'TEST-DRIVER-02', 'Scooter', TRUE),
  ('Miloš Petrović', 'milos.petrovic@driver.voro.test', 'TEST-DRIVER-03', 'Car', FALSE),
  ('Aleksandar Ilić', 'aleksandar.ilic@driver.voro.test', 'TEST-DRIVER-04', 'Bicycle', TRUE),
  ('Stefan Nikolić', 'stefan.nikolic@driver.voro.test', 'TEST-DRIVER-05', 'Scooter', TRUE),
  ('Luka Pavlović', 'luka.pavlovic@driver.voro.test', 'TEST-DRIVER-06', 'Car', TRUE),
  ('Vladimir Savić', 'vladimir.savic@driver.voro.test', 'TEST-DRIVER-07', 'Bicycle', FALSE),
  ('Filip Marković', 'filip.markovic@driver.voro.test', 'TEST-DRIVER-08', 'Scooter', TRUE),
  ('Andrej Đorđević', 'andrej.djordjevic@driver.voro.test', 'TEST-DRIVER-09', 'Car', TRUE),
  ('Ognjen Kovačević', 'ognjen.kovacevic@driver.voro.test', 'TEST-DRIVER-10', 'Bicycle', TRUE),
  ('Milan Ristić', 'milan.ristic@driver.voro.test', 'TEST-DRIVER-11', 'Scooter', FALSE),
  ('Nemanja Milošević', 'nemanja.milosevic@driver.voro.test', 'TEST-DRIVER-12', 'Car', TRUE),
  ('Ivan Popović', 'ivan.popovic@driver.voro.test', 'TEST-DRIVER-13', 'Bicycle', TRUE),
  ('Dušan Vasić', 'dusan.vasic@driver.voro.test', 'TEST-DRIVER-14', 'Scooter', TRUE),
  ('Petar Lazić', 'petar.lazic@driver.voro.test', 'TEST-DRIVER-15', 'Car', FALSE),
  ('Mihajlo Radović', 'mihajlo.radovic@driver.voro.test', 'TEST-DRIVER-16', 'Bicycle', TRUE),
  ('Vuk Tadić', 'vuk.tadic@driver.voro.test', 'TEST-DRIVER-17', 'Scooter', TRUE),
  ('Bojan Mirković', 'bojan.mirkovic@driver.voro.test', 'TEST-DRIVER-18', 'Car', TRUE),
  ('Dejan Simović', 'dejan.simovic@driver.voro.test', 'TEST-DRIVER-19', 'Bicycle', TRUE),
  ('Uroš Simić', 'uros.simic@driver.voro.test', 'TEST-DRIVER-20', 'Scooter', FALSE);

INSERT INTO "user" (name, email, password, role_id, email_verified, verified_at, is_active)
SELECT
  name,
  email,
  '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
  3,
  TRUE,
  NOW(),
  TRUE
FROM demo_driver_seed
ON CONFLICT ((LOWER(email))) DO UPDATE
SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role_id = 3,
  email_verified = TRUE,
  verified_at = NOW(),
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO courier (user_id, phone, vehicle_type, is_available)
SELECT driver.id, seed.phone, seed.vehicle_type, seed.is_available
FROM demo_driver_seed seed
INNER JOIN "user" driver ON driver.email = seed.email
ON CONFLICT (user_id) DO UPDATE
SET
  phone = EXCLUDED.phone,
  vehicle_type = EXCLUDED.vehicle_type,
  is_available = EXCLUDED.is_available,
  updated_at = NOW();

WITH customer_rows AS (
  SELECT
    customer.id AS user_id,
    address.id AS address_id,
    ROW_NUMBER() OVER (ORDER BY customer.email) AS row_number
  FROM "user" customer
  INNER JOIN address ON address.user_id = customer.id AND address.label = 'Kuća'
  WHERE customer.email LIKE 'customer.%@seed.voro.test'
),
restaurant_rows AS (
  SELECT
    restaurant.id,
    ROW_NUMBER() OVER (ORDER BY restaurant.name) AS row_number
  FROM restaurant
  INNER JOIN "user" owner ON owner.id = restaurant.owner_user_id
  WHERE owner.email LIKE 'restaurant.%@voro.test'
),
counts AS (
  SELECT
    (SELECT COUNT(*) FROM customer_rows) AS customer_count,
    (SELECT COUNT(*) FROM restaurant_rows) AS restaurant_count
)
INSERT INTO "order" (
  user_id, restaurant_id, address_id, status_id, subtotal, delivery_fee, total, note, created_at, updated_at
)
SELECT
  customer_rows.user_id,
  restaurant_rows.id,
  customer_rows.address_id,
  CASE generated.number % 7
    WHEN 0 THEN 6
    WHEN 1 THEN 1
    WHEN 2 THEN 2
    WHEN 3 THEN 3
    WHEN 4 THEN 4
    WHEN 5 THEN 5
    ELSE 7
  END,
  0,
  199,
  199,
  FORMAT('Demo seed Belgrade 2026 order %s', generated.number),
  NOW() - ((generated.number - 1) % 7) * INTERVAL '1 day' - ((generated.number * 17) % 600) * INTERVAL '1 minute',
  NOW()
FROM generate_series(1, 160) AS generated(number)
CROSS JOIN counts
INNER JOIN customer_rows ON customer_rows.row_number = ((generated.number - 1) % counts.customer_count) + 1
INNER JOIN restaurant_rows ON restaurant_rows.row_number = ((generated.number - 1) % counts.restaurant_count) + 1
WHERE NOT EXISTS (
  SELECT 1
  FROM "order" existing
  WHERE existing.note = FORMAT('Demo seed Belgrade 2026 order %s', generated.number)
);

INSERT INTO order_item (order_id, product_id, product_name, quantity, unit_price, total_price, note)
SELECT
  demo_order.id,
  product.id,
  product.name,
  1 + (demo_order.id % 2),
  product.price,
  product.price * (1 + (demo_order.id % 2)),
  'Demo seed stavka'
FROM "order" demo_order
INNER JOIN LATERAL (
  SELECT product.*
  FROM product
  WHERE product.restaurant_id = demo_order.restaurant_id
  ORDER BY product.id
  OFFSET (demo_order.id % 3)
  LIMIT 1
) product ON TRUE
WHERE demo_order.note LIKE 'Demo seed Belgrade 2026 order %'
  AND NOT EXISTS (
    SELECT 1
    FROM order_item existing
    WHERE existing.order_id = demo_order.id
  );

UPDATE "order" demo_order
SET
  subtotal = totals.subtotal,
  total = totals.subtotal + demo_order.delivery_fee,
  updated_at = NOW()
FROM (
  SELECT order_id, SUM(total_price) AS subtotal
  FROM order_item
  GROUP BY order_id
) totals
WHERE totals.order_id = demo_order.id
  AND demo_order.note LIKE 'Demo seed Belgrade 2026 order %';

WITH courier_rows AS (
  SELECT
    courier.id,
    ROW_NUMBER() OVER (ORDER BY courier.id) AS row_number
  FROM courier
  INNER JOIN "user" driver ON driver.id = courier.user_id
  WHERE driver.email LIKE '%@driver.voro.test'
),
demo_orders AS (
  SELECT
    id,
    status_id,
    created_at,
    ROW_NUMBER() OVER (ORDER BY id) AS row_number
  FROM "order"
  WHERE note LIKE 'Demo seed Belgrade 2026 order %'
),
counts AS (
  SELECT COUNT(*) AS courier_count FROM courier_rows
)
INSERT INTO delivery (order_id, courier_id, status_id, picked_up_at, delivered_at)
SELECT
  demo_orders.id,
  CASE WHEN demo_orders.status_id = 7 THEN NULL ELSE courier_rows.id END,
  CASE demo_orders.status_id
    WHEN 2 THEN 1
    WHEN 3 THEN 2
    WHEN 4 THEN 2
    WHEN 5 THEN 3
    WHEN 6 THEN 5
    ELSE 7
  END,
  CASE WHEN demo_orders.status_id IN (5, 6) THEN demo_orders.created_at + INTERVAL '25 minutes' ELSE NULL END,
  CASE WHEN demo_orders.status_id = 6 THEN demo_orders.created_at + INTERVAL '48 minutes' ELSE NULL END
FROM demo_orders
CROSS JOIN counts
INNER JOIN courier_rows ON courier_rows.row_number = ((demo_orders.row_number - 1) % counts.courier_count) + 1
WHERE demo_orders.status_id <> 1
ON CONFLICT (order_id) DO NOTHING;
