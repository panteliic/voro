# Deploy Voro on the Google Cloud VM

This deploys the API, PostgreSQL, Redis, migrations, and all four frontend apps together. PostgreSQL is a Docker container, not Cloud SQL: it creates the `voro` database automatically and stores its files in the `voro-postgres-data` Docker volume on the VM.

The current VM address is `34.116.215.26`. The configuration uses the free hostname `34-116-215-26.sslip.io` and Caddy obtains HTTPS certificates for the customer, restaurant, driver, admin, and API subdomains.

## 1. Open the two web ports in Google Cloud

In the Google Cloud Console, open **VPC network** > **Firewall** > **Create firewall rule** and set:

| Field | Value |
| --- | --- |
| Name | `voro-web` |
| Direction | Ingress |
| Targets | Specified target tags: `voro-web` |
| Source IPv4 ranges | `0.0.0.0/0` |
| Protocols and ports | TCP: `80,443` |

Save the rule. Then open **Compute Engine** > **VM instances** > `voro` > **Edit**, add `voro-web` in **Network tags**, and save. Do not open ports `5000`, `5432`, or `6379`.

## 2. Install Docker on the VM

Click **SSH** next to the `voro` VM. In the browser terminal, run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
exit
```

Close and open **SSH** again, then check the installation:

```bash
docker --version
docker compose version
```

## 3. Clone Voro

```bash
git clone https://github.com/panteliic/voro.git
cd voro
```

## 4. Create the private environment file

Copy the template in the root of the cloned repository:

```bash
cp gcp.env.example .env.gcp
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
nano .env.gcp
```

Put the generated values in `POSTGRES_PASSWORD`, `JWT_SECRET`, `PAYMENT_CARD_ENCRYPTION_KEY`, and `OBSERVABILITY_TOKEN`, respectively. Replace `CADDY_EMAIL` with your own email address. Keep `SEED_DEMO_DATA=false`.

`.env.gcp` stays only on the VM and is ignored by Git. Never commit it.

## 5. Build and start everything

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.yml up --build -d
docker compose --env-file .env.gcp -f docker-compose.gcp.yml ps
```

On the first launch the `migrations` container creates all database tables. Wait until `backend` is healthy, then create the first admin from inside the private backend container:

```bash
read -rp "Admin name: " ADMIN_NAME
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password: " ADMIN_PASSWORD; echo
docker compose --env-file .env.gcp -f docker-compose.gcp.yml exec \
  -e ADMIN_BOOTSTRAP_NAME="$ADMIN_NAME" \
  -e ADMIN_BOOTSTRAP_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_BOOTSTRAP_PASSWORD="$ADMIN_PASSWORD" \
  backend node dist/scripts/bootstrapAdmin.js
unset ADMIN_PASSWORD
```

Then open:

| Application | URL |
| --- | --- |
| Customer | `https://34-116-215-26.sslip.io` |
| Restaurant | `https://restaurant.34-116-215-26.sslip.io` |
| Driver | `https://driver.34-116-215-26.sslip.io` |
| Admin | `https://admin.34-116-215-26.sslip.io` |
| API health | `https://api.34-116-215-26.sslip.io/health` |

## Database access and updates

To open the database shell on the VM:

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.yml exec database psql -U voro -d voro
```

To update the deployment after a new commit is available:

```bash
git pull
docker compose --env-file .env.gcp -f docker-compose.gcp.yml up --build -d
```

If the VM's public IP changes, update `DOMAIN` in `.env.gcp` to the same IP written with hyphens and ending in `.sslip.io`, then rerun the build command.
