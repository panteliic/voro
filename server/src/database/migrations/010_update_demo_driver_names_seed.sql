-- Updates the first demo seed so existing local databases receive readable driver names.
-- Executed only through `npm run seed:demo`.

WITH driver_updates (old_email, name, email) AS (
  VALUES
    ('driver.01@seed.voro.test', 'Marko Jovanović', 'marko.jovanovic@driver.voro.test'),
    ('driver.02@seed.voro.test', 'Nikola Stanković', 'nikola.stankovic@driver.voro.test'),
    ('driver.03@seed.voro.test', 'Miloš Petrović', 'milos.petrovic@driver.voro.test'),
    ('driver.04@seed.voro.test', 'Aleksandar Ilić', 'aleksandar.ilic@driver.voro.test'),
    ('driver.05@seed.voro.test', 'Stefan Nikolić', 'stefan.nikolic@driver.voro.test'),
    ('driver.06@seed.voro.test', 'Luka Pavlović', 'luka.pavlovic@driver.voro.test'),
    ('driver.07@seed.voro.test', 'Vladimir Savić', 'vladimir.savic@driver.voro.test'),
    ('driver.08@seed.voro.test', 'Filip Marković', 'filip.markovic@driver.voro.test'),
    ('driver.09@seed.voro.test', 'Andrej Đorđević', 'andrej.djordjevic@driver.voro.test'),
    ('driver.10@seed.voro.test', 'Ognjen Kovačević', 'ognjen.kovacevic@driver.voro.test'),
    ('driver.11@seed.voro.test', 'Milan Ristić', 'milan.ristic@driver.voro.test'),
    ('driver.12@seed.voro.test', 'Nemanja Milošević', 'nemanja.milosevic@driver.voro.test'),
    ('driver.13@seed.voro.test', 'Ivan Popović', 'ivan.popovic@driver.voro.test'),
    ('driver.14@seed.voro.test', 'Dušan Vasić', 'dusan.vasic@driver.voro.test'),
    ('driver.15@seed.voro.test', 'Petar Lazić', 'petar.lazic@driver.voro.test'),
    ('driver.16@seed.voro.test', 'Mihajlo Radović', 'mihajlo.radovic@driver.voro.test'),
    ('driver.17@seed.voro.test', 'Vuk Tadić', 'vuk.tadic@driver.voro.test'),
    ('driver.18@seed.voro.test', 'Bojan Mirković', 'bojan.mirkovic@driver.voro.test'),
    ('driver.19@seed.voro.test', 'Dejan Simović', 'dejan.simovic@driver.voro.test'),
    ('driver.20@seed.voro.test', 'Uroš Simić', 'uros.simic@driver.voro.test')
)
UPDATE "user" driver
SET
  name = driver_updates.name,
  email = driver_updates.email,
  updated_at = NOW()
FROM driver_updates
WHERE driver.email = driver_updates.old_email;
