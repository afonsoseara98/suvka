# Pôr o Noctra em produção

Ubuntu 24.04 novo → domínio público com HTTPS. **Menos de 30 minutos**, quase tudo à espera
que coisas instalem.

Escrito para ser seguido de cima a baixo sem saber nada do projeto. Cada comando é para
copiar. Onde tiver de decidir alguma coisa, está assinalado.

> **Isto nunca correu numa máquina real.** É correto quanto à leitura, e o primeiro
> `./deploy/deploy.sh` é o primeiro teste a sério. Conte com uma ou duas coisas a partir —
> a saída diz quais, e a secção **Quando correr mal** no fim cobre as prováveis.

---

## Antes de começar

Precisa de três coisas que só você pode obter:

| | Onde | Custo |
|---|---|---|
| Uma VPS Ubuntu 24.04 | Hetzner CX22, DigitalOcean, Vultr | ~4–6 €/mês |
| Um domínio | qualquer registrar | ~10 €/ano |
| Chaves Stripe **live** | dashboard.stripe.com | grátis até faturar |

O CX22 da Hetzner chega e sobra: a geração é determinística, o fluxo dos restaurantes não
faz uma única chamada a um modelo, e o mais pesado que a máquina faz é servir JPEGs.

---

## 1. DNS primeiro (5 min de espera, faça já)

No painel do seu domínio, dois registos A a apontar para o IP da VPS:

```
A    @      SEU.IP.AQUI
A    www    SEU.IP.AQUI
```

Faça isto **antes** de tudo o resto. O Caddy vai buscar o certificado no momento em que
arranca e precisa que o domínio já resolva. Confirme com:

```bash
dig +short SEU-DOMINIO.pt
```

---

## 2. A máquina (5 min)

```bash
ssh root@SEU.IP.AQUI
```

```bash
# Node 22, Postgres, Caddy, git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs postgresql caddy git

# Um utilizador que não é root para correr a aplicação
adduser --system --group --home /srv/noctra noctra
usermod -s /bin/bash noctra

# A pasta das fotografias, FORA do repositório
mkdir -p /srv/noctra-uploads
chown noctra:noctra /srv/noctra-uploads
```

Deixar o `deploy.sh` reiniciar o serviço sem pedir password:

```bash
echo 'noctra ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart noctra' > /etc/sudoers.d/noctra
chmod 440 /etc/sudoers.d/noctra
```

---

## 3. Base de dados (2 min)

```bash
sudo -u postgres createuser noctra --pwprompt    # ANOTE a password
sudo -u postgres createdb noctra --owner=noctra
```

---

## 4. O código (2 min)

```bash
sudo -u noctra -H bash
cd /srv/noctra
git clone SEU-REPOSITORIO .
```

---

## 5. Segredos (5 min)

```bash
cp deploy/.env.production.example .env.production
nano .env.production          # preencher tudo
chmod 600 .env.production
```

O ficheiro de exemplo explica cada variável. Os três valores que as pessoas erram:

- **`AUTH_SECRET`** — gere um novo com `openssl rand -base64 32`. Nunca reutilize o de
  desenvolvimento: quem o tiver consegue forjar uma sessão para qualquer conta.
- **`STRIPE_PRICE_ID`** — tem de ser um Price criado no **modo live**. Um `price_` de teste
  não existe em live e o checkout falha com "No such price".
- **`NOCTRA_UPLOADS_DIR`** — deixe em `/srv/noctra-uploads`. Se mudar, mude também o
  `Caddyfile` e o `backup.sh`.

---

## 6. Caddy e systemd (3 min)

Noutro terminal, como root:

```bash
# Editar o domínio e o email ANTES de copiar
nano /srv/noctra/deploy/Caddyfile
cp /srv/noctra/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

cp /srv/noctra/deploy/noctra.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable noctra
```

---

## 7. O primeiro deploy (5 min)

De volta ao utilizador `noctra`:

```bash
cd /srv/noctra
chmod +x deploy/*.sh
./deploy/deploy.sh
```

O script instala, migra a base de dados, faz o build, reinicia e **verifica**. Se disser
`==> Online` seguido de `==> Tudo bem`, está no ar.

---

## 8. Stripe live (5 min)

No dashboard do Stripe, com o interruptor em **live**:

1. **Developers → API keys** → copiar `sk_live_…` e `pk_live_…` para o `.env.production`
2. **Products** → criar "Noctra Pro", 19 € recorrente mensal → copiar o `price_…`
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://SEU-DOMINIO.pt/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copiar o `whsec_…` para o `.env.production`

```bash
sudo systemctl restart noctra
```

O webhook **recusa todos os pedidos** enquanto `STRIPE_WEBHOOK_SECRET` não existir. É de
propósito: é público por necessidade e, sem assinatura verificada, quem souber o URL marca
qualquer cliente como pagante.

---

## 9. Cópias de segurança (2 min)

Como root:

```bash
cp /srv/noctra/deploy/backup.sh /usr/local/bin/noctra-backup
chmod +x /usr/local/bin/noctra-backup
crontab -e
```

```
15 4 * * * /usr/local/bin/noctra-backup
```

**Corra o `restore.sh` uma vez, hoje, num dia calmo.** Uma cópia que nunca foi reposta é
uma esperança, não uma cópia — e o dia em que precisar dela não é o dia para descobrir que
não funciona.

---

## Confirmar que está mesmo bom

```bash
./deploy/healthcheck.sh https://SEU-DOMINIO.pt
```

E depois faça o que um cliente faz: abrir o site, preencher o formulário, carregar uma
fotografia, publicar. Se isso funcionar de ponta a ponta, o deploy é real.

A [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) tem a lista completa.

---

## Quando correr mal

**Não responde, e o `journalctl` diz `UntrustedHost`**
Falta `AUTH_URL` no `.env.production`, ou não coincide com o domínio real.

**O checkout dá 500**
`STRIPE_PRICE_ID` é de teste e as chaves são live, ou o contrário. Os dois têm de estar no
mesmo modo.

**As fotografias dão 404**
`NOCTRA_UPLOADS_DIR` e o `root` do `Caddyfile` não apontam para o mesmo sítio, ou a pasta
não pertence ao utilizador `noctra`.

**Os sites publicados não sabem que alguém pagou**
O webhook não está a chegar. Veja **Developers → Webhooks → o seu endpoint → Attempts** no
Stripe: mostra o código de resposta de cada tentativa.

**O deploy correu mas partiu qualquer coisa**

```bash
./deploy/rollback.sh
```

Volta ao commit que estava online antes. Avisa se houve migrações pelo meio, porque essas
**não** são revertidas — uma migração que apagou uma coluna não repõe os dados ao voltar
atrás.
