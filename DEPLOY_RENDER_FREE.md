# Voro: besplatan deploy na Render, Supabase i Upstash

Ovo je za demo i testiranje, ne za placanje korisnika. Render besplatan API zaspi posle 15 minuta bez saobracaja. Kada ga neko ponovo otvori, prvo pokretanje traje do oko minut.

## 1. Push deployment konfiguraciju na GitHub

Sa racunara, u folderu projekta, proveri promene pa ih pushuj na granu koju koristis za Cloudflare Pages:

```powershell
git status
git add server/src/config/env.ts server/src/database/pool.ts server/package.json render.yaml DEPLOY_RENDER_FREE.md
git commit -m "Add Render free API deployment"
git push
```

Ne dodaj `.env` fajlove niti lozinke u Git.

## 2. Napravi PostgreSQL bazu na Supabase

1. Otvori [Supabase dashboard](https://supabase.com/dashboard/sign-up) i napravi besplatan nalog.
2. Klikni **New project**, izaberi organizaciju i nazovi projekat `voro`.
3. Zapamti Database Password; nije isto sto i tvoja Supabase lozinka.
4. Kada se projekat napravi, klikni **Connect** na vrhu stranice.
5. Izaberi **Session pooler** i kopiraj ceo connection string. On pocinje sa `postgresql://` ili `postgres://`.

Koristi Session pooler, ne Direct connection: on radi i sa Render IPv4 mrezom.

## 3. Napravi Redis na Upstash

1. Otvori [Upstash Console](https://console.upstash.com/) i napravi nalog.
2. Klikni **Create database** > **Regional** > naziv `voro-redis`.
3. Izaberi najblizi evropski region, na primer Frankfurt.
4. U detaljima baze otvori **Connect** i kopiraj Redis URL koji pocinje sa `rediss://`.

Taj `rediss://` URL je vrednost za `REDIS_URL` na Renderu. Ne stavljaj ga u frontend ili Git.

## 4. Napravi Render API iz GitHub repozitorijuma

1. Otvori [Render Dashboard](https://dashboard.render.com/).
2. Klikni **New** > **Blueprint** i povezi GitHub ako te pita.
3. Izaberi repozitorijum `panteliic/voro` i granu na koju si upravo pushovao promene.
4. Render ce pronaci `render.yaml`. Klikni **Apply**.
5. Otvori nov servis `voro-api` > **Environment**. Nalepi vrednosti ispod, pa klikni **Save changes** / **Deploy**.

## 5. Render environment vrednosti

Zameni tekst u uglastim zagradama stvarnim vrednostima. Sve tajne unosi samo na Renderu.

```text
DATABASE_URL=[Supabase Session pooler URL]
REDIS_URL=[Upstash rediss:// URL]
CLIENT_URLS=https://[customer].pages.dev,https://[restaurant].pages.dev,https://[driver].pages.dev,https://[admin].pages.dev
API_URL=https://voro-api.onrender.com
JWT_SECRET=[openssl rand -hex 32]
PAYMENT_CARD_ENCRYPTION_KEY=[openssl rand -hex 32]
OBSERVABILITY_TOKEN=[openssl rand -hex 32]
```

Za tri tajne na Windows PowerShell pokreni po jednom:

```powershell
openssl rand -hex 32
```

Ako `openssl` nije instaliran, pokreni po jednom:

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

Ne postavljaj `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` ili `DB_PASSWORD`; `DATABASE_URL` vec sadrzi sve.

## 6. Google login (Auth0)

U Render Environment dodaj stvarne Auth0 vrednosti:

```text
AUTH0_DOMAIN=[tvoj Auth0 domen]
AUTH0_CLIENT_ID=[tvoj Auth0 client ID]
AUTH0_CLIENT_SECRET=[tvoj Auth0 client secret]
AUTH0_CALLBACK_URL=https://voro-api.onrender.com/auth/auth0/callback
AUTH0_CLIENT_REDIRECT_URL=https://[customer].pages.dev/auth/callback
```

U Auth0 aplikaciji dodaj callback adresu pod **Allowed Callback URLs** i sve cetiri Pages adrese pod **Allowed Web Origins**. Dodaj customer callback adresu u **Allowed Logout URLs**.

## 7. Povezi vec objavljene frontove

Kada Render deploy prodje, otvori svaki od cetiri Cloudflare Pages projekta:

1. **Settings** > **Environment variables** > **Add**.
2. Dodaj `VITE_API_URL` = `https://voro-api.onrender.com` za Production.
3. Klikni **Deployments** > **Retry deployment** za svaki frontend.

Proveri `https://voro-api.onrender.com/health`. Prvi deploy automatski pokrece SQL migracije i pravi tabele u Supabase bazi.

## Ne prenosi lokalne demo podatke

Ovaj deploy pravi novu praznu bazu. Ako kasnije zelis konkretne lokalne naloge ili porudzbine u cloudu, eksportujemo samo izabrane podatke nakon sto aplikacija proradi.
