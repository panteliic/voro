-- Voro: 60 extra restaurants for Supabase SQL Editor.
-- Copy and run this ENTIRE file. It is exactly one SQL statement, so it also
-- works in SQL Editors that execute ordinary statements separately.
-- It adds/updates only the 60 extra restaurants, their managers and their menus.
-- Manager passwords: password123

DO $voro_fixture$
DECLARE
  restaurant_rows JSONB := $voro_data$[
    {"position":1,"name":"Picerija Dunav","category_slug":"pizza","secondary_category_slug":"italian"},
    {"position":2,"name":"Italiana Vracar","category_slug":"italian","secondary_category_slug":"pasta"},
    {"position":3,"name":"Testenina 21","category_slug":"pasta","secondary_category_slug":"italian"},
    {"position":4,"name":"Pizza Kruna","category_slug":"pizza","secondary_category_slug":"fast-food"},
    {"position":5,"name":"La Casa Pasta","category_slug":"pasta","secondary_category_slug":"italian"},
    {"position":6,"name":"Napoli Express","category_slug":"pizza","secondary_category_slug":"italian"},
    {"position":7,"name":"Smash Corner","category_slug":"burgers","secondary_category_slug":"american"},
    {"position":8,"name":"Burger Republika","category_slug":"burgers","secondary_category_slug":"american"},
    {"position":9,"name":"Grill and Bun","category_slug":"burgers","secondary_category_slug":"fast-food"},
    {"position":10,"name":"Street Bite","category_slug":"fast-food","secondary_category_slug":"burgers"},
    {"position":11,"name":"Rostilj 011","category_slug":"serbian","secondary_category_slug":"fast-food"},
    {"position":12,"name":"Chicken District","category_slug":"chicken","secondary_category_slug":"fast-food"},
    {"position":13,"name":"Zeleni Rostilj","category_slug":"serbian","secondary_category_slug":"healthy"},
    {"position":14,"name":"Leskovacki Kutak","category_slug":"serbian","secondary_category_slug":"fast-food"},
    {"position":15,"name":"Daska i Meso","category_slug":"serbian","secondary_category_slug":"american"},
    {"position":16,"name":"Cevap Kuca","category_slug":"serbian","secondary_category_slug":"fast-food"},
    {"position":17,"name":"Wok Station","category_slug":"asian","secondary_category_slug":"chinese"},
    {"position":18,"name":"Asian Bowl","category_slug":"asian","secondary_category_slug":"healthy"},
    {"position":19,"name":"Kina Garden","category_slug":"chinese","secondary_category_slug":"asian"},
    {"position":20,"name":"Noodle Lab","category_slug":"chinese","secondary_category_slug":"asian"},
    {"position":21,"name":"Tokyo Roll","category_slug":"sushi","secondary_category_slug":"asian"},
    {"position":22,"name":"Sushi Studio","category_slug":"sushi","secondary_category_slug":"asian"},
    {"position":23,"name":"Maki House","category_slug":"sushi","secondary_category_slug":"asian"},
    {"position":24,"name":"Ramen Corner","category_slug":"asian","secondary_category_slug":"sushi"},
    {"position":25,"name":"Burrito Barrio","category_slug":"mexican","secondary_category_slug":"fast-food"},
    {"position":26,"name":"Taco Plaza","category_slug":"mexican","secondary_category_slug":"fast-food"},
    {"position":27,"name":"Quesadilla House","category_slug":"mexican","secondary_category_slug":"fast-food"},
    {"position":28,"name":"Mexicano 24","category_slug":"mexican","secondary_category_slug":"fast-food"},
    {"position":29,"name":"Green Bowl","category_slug":"healthy","secondary_category_slug":"vegan"},
    {"position":30,"name":"Fresh and Fit","category_slug":"healthy","secondary_category_slug":"breakfast"},
    {"position":31,"name":"Salata Plus","category_slug":"healthy","secondary_category_slug":"vegan"},
    {"position":32,"name":"Veganski Sto","category_slug":"vegan","secondary_category_slug":"healthy"},
    {"position":33,"name":"Leaf Kitchen","category_slug":"vegan","secondary_category_slug":"healthy"},
    {"position":34,"name":"Plant Power","category_slug":"vegan","secondary_category_slug":"healthy"},
    {"position":35,"name":"Slatka Kuca","category_slug":"desserts","secondary_category_slug":"pancakes"},
    {"position":36,"name":"Kolac Lab","category_slug":"desserts","secondary_category_slug":"pancakes"},
    {"position":37,"name":"Donut Corner","category_slug":"desserts","secondary_category_slug":"breakfast"},
    {"position":38,"name":"Pancake Story","category_slug":"pancakes","secondary_category_slug":"desserts"},
    {"position":39,"name":"Jutro Cafe","category_slug":"breakfast","secondary_category_slug":"healthy"},
    {"position":40,"name":"Brunch House","category_slug":"breakfast","secondary_category_slug":"healthy"},
    {"position":41,"name":"Omlet Bar","category_slug":"breakfast","secondary_category_slug":"healthy"},
    {"position":42,"name":"Pekara i Dorucak","category_slug":"breakfast","secondary_category_slug":"fast-food"},
    {"position":43,"name":"Gyros Corner","category_slug":"gyros","secondary_category_slug":"fast-food"},
    {"position":44,"name":"Grcki Tanjir","category_slug":"gyros","secondary_category_slug":"healthy"},
    {"position":45,"name":"Shawarma Hub","category_slug":"middle-eastern","secondary_category_slug":"fast-food"},
    {"position":46,"name":"Falafel Garden","category_slug":"middle-eastern","secondary_category_slug":"vegan"},
    {"position":47,"name":"Biryani Box","category_slug":"indian","secondary_category_slug":"asian"},
    {"position":48,"name":"Curry House","category_slug":"indian","secondary_category_slug":"asian"},
    {"position":49,"name":"Balkan Meso","category_slug":"serbian","secondary_category_slug":"fast-food"},
    {"position":50,"name":"Domaca Trpeza","category_slug":"serbian","secondary_category_slug":"breakfast"},
    {"position":51,"name":"Kafana Kod Mosta","category_slug":"serbian","secondary_category_slug":"breakfast"},
    {"position":52,"name":"Sarma i Supa","category_slug":"serbian","secondary_category_slug":"healthy"},
    {"position":53,"name":"Sendvic Bar","category_slug":"fast-food","secondary_category_slug":"breakfast"},
    {"position":54,"name":"Wrap Works","category_slug":"fast-food","secondary_category_slug":"chicken"},
    {"position":55,"name":"Hot Dog Garage","category_slug":"fast-food","secondary_category_slug":"american"},
    {"position":56,"name":"Pomfrit Kralj","category_slug":"fast-food","secondary_category_slug":"burgers"},
    {"position":57,"name":"Morski Tanjir","category_slug":"sushi","secondary_category_slug":"healthy"},
    {"position":58,"name":"Seafood Point","category_slug":"sushi","secondary_category_slug":"asian"},
    {"position":59,"name":"Balkan Sweets","category_slug":"desserts","secondary_category_slug":"pancakes"},
    {"position":60,"name":"Zdravi Zalogaj","category_slug":"healthy","secondary_category_slug":"vegan"}
  ]$voro_data$;
BEGIN
  INSERT INTO restaurant_category (name, slug, icon, sort_order)
  VALUES
    ('Pizza', 'pizza', 'pizza', 10), ('Burgers', 'burgers', 'burger', 20),
    ('Serbian', 'serbian', 'utensils', 30), ('Italian', 'italian', 'chef-hat', 40),
    ('Pasta', 'pasta', 'pasta', 50), ('Asian', 'asian', 'soup', 60),
    ('Sushi', 'sushi', 'fish', 70), ('Chinese', 'chinese', 'bowl', 80),
    ('Mexican', 'mexican', 'flame', 90), ('Healthy', 'healthy', 'salad', 100),
    ('Vegan', 'vegan', 'leaf', 110), ('Desserts', 'desserts', 'ice-cream', 120),
    ('Breakfast', 'breakfast', 'coffee', 130), ('Fast food', 'fast-food', 'sandwich', 140),
    ('Chicken', 'chicken', 'drumstick', 150), ('American', 'american', 'beef', 160),
    ('Indian', 'indian', 'cooking-pot', 170), ('Middle Eastern', 'middle-eastern', 'wrap', 180),
    ('Gyros', 'gyros', 'wrap', 190), ('Pancakes', 'pancakes', 'cake-slice', 200)
  ON CONFLICT (name) DO UPDATE
  SET slug = EXCLUDED.slug, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, updated_at = NOW();

  WITH input AS (
    SELECT * FROM jsonb_to_recordset(restaurant_rows)
      AS row_data(position INTEGER, name TEXT, category_slug TEXT, secondary_category_slug TEXT)
  )
  INSERT INTO restaurant (
    category_id, name, description, phone, email, address, latitude, longitude,
    is_active, is_accepting_orders, preparation_minutes, delivery_radius_km
  )
  SELECT category.id, input.name, 'Voro test restoran: ' || input.name || '.',
    '+381641' || LPAD(input.position::TEXT, 6, '0'),
    'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
    'Voro lokacija ' || input.position || ', Beograd',
    (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
    (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
    TRUE, TRUE, 20 + (input.position % 3) * 5, 8.00
  FROM input
  INNER JOIN restaurant_category category ON category.slug = input.category_slug
  WHERE NOT EXISTS (
    SELECT 1 FROM restaurant existing
    WHERE LOWER(existing.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test')
  );

  WITH input AS (
    SELECT * FROM jsonb_to_recordset(restaurant_rows)
      AS row_data(position INTEGER, name TEXT, category_slug TEXT, secondary_category_slug TEXT)
  )
  UPDATE restaurant
  SET category_id = category.id, name = input.name,
    description = 'Voro test restoran: ' || input.name || '.',
    phone = '+381641' || LPAD(input.position::TEXT, 6, '0'),
    address = 'Voro lokacija ' || input.position || ', Beograd',
    latitude = (44.7750000 + ((input.position % 15) * 0.0028))::NUMERIC(10, 7),
    longitude = (20.4150000 + ((input.position % 12) * 0.0042))::NUMERIC(10, 7),
    is_active = TRUE, is_accepting_orders = TRUE,
    preparation_minutes = 20 + (input.position % 3) * 5,
    delivery_radius_km = 8.00, updated_at = NOW()
  FROM input
  INNER JOIN restaurant_category category ON category.slug = input.category_slug
  WHERE LOWER(restaurant.email) = LOWER('restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test');

  WITH input AS (
    SELECT * FROM jsonb_to_recordset(restaurant_rows)
      AS row_data(position INTEGER, name TEXT, category_slug TEXT, secondary_category_slug TEXT)
  )
  INSERT INTO restaurant_user (restaurant_id, name, email, password, access_role, is_active, email_verified)
  SELECT restaurant.id, 'Menadzer ' || LPAD(input.position::TEXT, 2, '0'),
    'manager.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test',
    '$2b$10$H3rNaM3oW.1WvFLD99/GWeMeJnXBDUSEgxgdMIk/N2LXNUnXouBpi',
    'manager', TRUE, TRUE
  FROM input
  INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
  ON CONFLICT ((LOWER(email))) DO UPDATE
  SET restaurant_id = EXCLUDED.restaurant_id, name = EXCLUDED.name,
      password = EXCLUDED.password, access_role = 'manager', is_active = TRUE,
      email_verified = TRUE, updated_at = NOW();

  WITH input AS (
    SELECT * FROM jsonb_to_recordset(restaurant_rows)
      AS row_data(position INTEGER, name TEXT, category_slug TEXT, secondary_category_slug TEXT)
  )
  INSERT INTO restaurant_category_map (restaurant_id, category_id)
  SELECT restaurant.id, category.id
  FROM input
  INNER JOIN restaurant ON restaurant.email = 'restoran.' || LPAD(input.position::TEXT, 2, '0') || '@voro.test'
  INNER JOIN restaurant_category category ON category.slug IN (input.category_slug, input.secondary_category_slug)
  ON CONFLICT DO NOTHING;

  WITH target_restaurants AS (
    SELECT restaurant.id FROM restaurant WHERE restaurant.email LIKE 'restoran.%@voro.test'
  ), menu_categories AS (
    SELECT * FROM (VALUES
      ('Glavna jela', 'Glavni obroci i specijaliteti restorana.'),
      ('Dodaci', 'Prilozi, salate i dodatni ukusi.'),
      ('Pice', 'Bezalkoholna pica uz obrok.')
    ) AS value(name, description)
  )
  INSERT INTO product_category (restaurant_id, name, description)
  SELECT target.id, category.name, category.description
  FROM target_restaurants target CROSS JOIN menu_categories category
  ON CONFLICT (restaurant_id, name) DO UPDATE
  SET description = EXCLUDED.description, updated_at = NOW();

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
    SELECT menu.restaurant_id,
      CASE WHEN menu.position <= 8 THEN 'Glavna jela' WHEN menu.position <= 12 THEN 'Dodaci' ELSE 'Pice' END AS category_name,
      menu.name, 'Voro test meni: ' || menu.name || '.' AS description,
      (CASE
        WHEN menu.position BETWEEN 13 AND 15 THEN 150 + ((menu.position - 13) * 70)
        WHEN menu.position BETWEEN 9 AND 12 THEN 240 + ((menu.position - 9) * 80)
        WHEN menu.category_slug = 'sushi' THEN 790 + (menu.position * 110)
        WHEN menu.category_slug IN ('desserts', 'pancakes', 'breakfast') THEN 390 + (menu.position * 60)
        WHEN menu.category_slug IN ('healthy', 'vegan') THEN 590 + (menu.position * 70)
        WHEN menu.category_slug IN ('asian', 'chinese', 'mexican', 'indian', 'middle-eastern') THEN 650 + (menu.position * 85)
        ELSE 590 + (menu.position * 85)
      END + ((menu.restaurant_id % 5) * 20))::NUMERIC(10, 2) AS price
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
END;
$voro_fixture$;
