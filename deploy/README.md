# Deploy

One VPS, one Node process, Caddy in front, Postgres beside it, photographs on disk.
Everything here has been written for a fresh Ubuntu 24.04 box.

**These files have never been run against a real server.** They are correct as far as
reading them goes, and the first `./deploy/deploy.sh` on a real machine is the first real
test. Expect to fix one or two things; the failure output tells you which.

---

## 1. The server

Hetzner CX22 (~€4/mo) or DigitalOcean's $6 droplet. Either is more than enough: the
generation is deterministic, there is no LLM call in the restaurant path, and the heaviest
thing the box does is resize nothing and serve some JPEGs.

Ubuntu 24.04. Note the IP.

## 2. One-time setup, as root

```bash
# Node 22, Postgres, Caddy, git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs postgresql caddy git

# A user that is not root to run the app
adduser --system --group --home /srv/suvka suvka
usermod -s /bin/bash suvka

# The database
sudo -u postgres createuser suvka --pwprompt      # note the password
sudo -u postgres createdb suvka --owner=suvka
```

Let the deploy script restart the service without a password:

```bash
echo 'suvka ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart suvka' > /etc/sudoers.d/suvka
chmod 440 /etc/sudoers.d/suvka
```

## 3. The code

```bash
sudo -u suvka -H bash
cd /srv/suvka
git clone SEU-REPO .
```

## 4. Secrets

`/srv/suvka/.env.production`, owned by `suvka`, mode `600`. Nothing here belongs in git.

```bash
DATABASE_URL="postgresql://suvka:A-PASSWORD@localhost:5432/suvka?schema=public"

# Generate a fresh one. The development value must not travel to production - it signs
# every session cookie, and anyone holding it can mint a session for any account.
AUTH_SECRET="$(openssl rand -base64 32)"

# The public origin, used to build absolute URLs and to validate auth callbacks. All
# three must name the same domain - startup refuses if APP_URL and AUTH_URL disagree.
# APP_URL is what /sitemap.xml and /robots.txt are built from: without it the sitemap
# would serve localhost URLs, return 200, and index nothing.
APP_URL="https://suvka.com"
AUTH_URL="https://suvka.com"
NEXTAUTH_URL="https://suvka.com"

# Stock photographs. Without it every generated site is text-only - it still works, it
# just looks like a draft.
PEXELS_API_KEY="..."

# Only needed by the free-text path for other business types. The restaurant flow makes
# no model call at all.
OPENAI_API_KEY="..."

# Payments. Without these the product runs exactly as before - the dashboard shows the free
# period and simply offers no button, because a checkout that 500s is worse than none.
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### O webhook

Every subscription fact comes from Stripe: renewals, cancellations, a card failing three
weeks from now. None of those pass through the app, so without the webhook the dashboard
freezes on whatever it knew at checkout.

In production, add the endpoint in the Stripe dashboard - `https://suvka.com/api/stripe/webhook`,
events `checkout.session.completed` and `customer.subscription.*` - and paste the signing
secret it gives you.

Locally, the CLI does the same job and prints the secret:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The endpoint refuses everything while `STRIPE_WEBHOOK_SECRET` is unset. That is deliberate:
it is public by necessity, and unverified it would let anyone who knows the URL mark any
customer as paying.

```bash
chmod 600 /srv/suvka/.env.production
```

## 5. Caddy and systemd

```bash
# As root
cp /srv/suvka/deploy/Caddyfile /etc/caddy/Caddyfile     # edit the domain and email first
systemctl reload caddy

cp /srv/suvka/deploy/suvka.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now suvka
```

Point an A record at the server's IP before reloading Caddy — it fetches the certificate
on the spot and needs the domain to already resolve.

## 6. Deploy

```bash
chmod +x /srv/suvka/deploy/deploy.sh
sudo -u suvka -H /srv/suvka/deploy/deploy.sh
```

Every deploy after this one is the same command.

---

## Things that will bite

**One machine, on purpose — and the reason changed.** Drafts used to live in memory, so a
second worker held a different map and a visitor who generated on worker A got a 404 from
worker B. That is fixed: drafts are rows in Postgres and survive both restarts and workers.

What still pins this to one machine is **photographs on local disk** (`public/uploads`).
A second machine cannot see the first one's uploads, so a customer's own dish would 404 for
half the visitors. Before scaling out: move uploads to object storage, and set
`UPSTASH_REDIS_REST_URL`/`_TOKEN` so rate limiting is shared rather than per-process.

**Photographs are on this disk.** `public/uploads` is gitignored, so `git pull` leaves it
alone. It is not in any backup unless you make one:

```bash
0 3 * * * tar czf /var/backups/uploads-$(date +\%F).tgz /srv/suvka/public/uploads
```

Losing that directory means every restaurant's own photographs are gone and their sites
fall back to stock. Back it up before the first customer, not after.

**Back up Postgres too.**

```bash
0 4 * * * sudo -u postgres pg_dump suvka | gzip > /var/backups/suvka-$(date +\%F).sql.gz
```

**The dev routes are already closed.** `/preview`, `/preview/[id]` and `/preview/restaurant`
return 404 when `NODE_ENV=production`. `/preview/d/[draftId]` is the real product surface
and stays open — that is correct, not an oversight.

**A restart drops every unpublished draft.** Someone mid-flow when you deploy loses their
preview and has to fill the form again. Two minutes of work, and worth deploying outside
mealtimes once there are real users.

## Checking it worked

```bash
curl -I https://suvka.com                    # 200, and a valid certificate
journalctl -u suvka -n 50 --no-pager        # no stack traces
```

Then do the thing a customer does: open the site, fill the form, upload a photograph,
publish. If that works end to end, the deploy is real.
