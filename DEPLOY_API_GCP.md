# Deploy the Voro API, database, and Redis on Google Cloud

Cloudflare Pages hosts the four frontend applications. This deployment runs the API, PostgreSQL, and Redis together on one Google Cloud VM. Only `https://api.YOUR_DOMAIN` is public; the database and Redis do not expose ports to the internet.

## 1. Prepare the Cloudflare DNS record

In Cloudflare **DNS**, create an `A` record:

| Type | Name | Target | Proxy status |
| --- | --- | --- | --- |
| A | `api` | your VM's public IPv4 address | **DNS only** initially |

Wait until `nslookup api.YOUR_DOMAIN` returns the VM IP. Keeping it DNS-only for the first start lets Caddy issue a Let's Encrypt certificate directly. After HTTPS works, you may switch it to proxied and set Cloudflare SSL/TLS mode to **Full (strict)**.

## 2. Create the VM and firewall rule

Create an Ubuntu 24.04 Compute Engine VM with at least **e2-medium** (2 vCPU, 4 GB RAM) and a persistent disk. Add a firewall rule allowing inbound TCP ports `80` and `443` to the VM's network tag. Do not open `5000`, `5432`, or `6379`.

## 3. Install Docker and get the project

Open the VM's browser SSH terminal and run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
exit
```

Open SSH again, then clone the repository:

```bash
git clone https://github.com/panteliic/voro.git
cd voro
cp gcp.backend.env.example .env.gcp
```

## 4. Fill in the private environment file

Generate four secrets, then edit the file:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
nano .env.gcp
```

Set `DOMAIN` to your real Cloudflare domain, fill the four exact Pages URLs, and paste the generated values into `POSTGRES_PASSWORD`, `JWT_SECRET`, `PAYMENT_CARD_ENCRYPTION_KEY`, and `OBSERVABILITY_TOKEN`. Keep this file on the VM only; it is ignored by Git.

Add your production Auth0 Google credentials and use:

```text
AUTH0_CALLBACK_URL=https://api.YOUR_DOMAIN/auth/auth0/callback
AUTH0_CLIENT_REDIRECT_URL=https://YOUR_CUSTOMER_PAGES_URL/auth/callback
```

In Auth0, add the same callback URL under **Allowed Callback URLs** and all four Pages URLs under **Allowed Web Origins**. Add the customer callback URL under **Allowed Logout URLs** as well.

## 5. Start the API, database, and Redis

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.backend.yml up --build -d
docker compose --env-file .env.gcp -f docker-compose.gcp.backend.yml ps
curl https://api.YOUR_DOMAIN/health
```

The first start runs database migrations automatically. Then create your first admin without putting its password in a shell history:

```bash
read -rp "Admin name: " ADMIN_NAME
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password: " ADMIN_PASSWORD; echo
docker compose --env-file .env.gcp -f docker-compose.gcp.backend.yml exec \
  -e ADMIN_BOOTSTRAP_NAME="$ADMIN_NAME" \
  -e ADMIN_BOOTSTRAP_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_BOOTSTRAP_PASSWORD="$ADMIN_PASSWORD" \
  backend node dist/scripts/bootstrapAdmin.js
unset ADMIN_PASSWORD
```

## 6. Point the Pages apps at the API

For each Cloudflare Pages project set production variable:

```text
VITE_API_URL=https://api.YOUR_DOMAIN
```

Then redeploy each Pages project. A Vite environment variable is compiled into the frontend during the build, so this redeploy is required.

## Updates and database access

On the VM after pushing a new commit:

```bash
git pull
docker compose --env-file .env.gcp -f docker-compose.gcp.backend.yml up --build -d
```

Database access is only from inside the VM:

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.backend.yml exec database psql -U voro -d voro
```
