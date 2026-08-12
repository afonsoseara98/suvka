# Pôr o Suvka em produção

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
adduser --system --group --home /srv/suvka suvka
usermod -s /bin/bash suvka

# A pasta das fotografias, FORA do repositório
mkdir -p /srv/suvka-uploads
chown suvka:suvka /srv/suvka-uploads
```

Deixar o `deploy.sh` reiniciar o serviço sem pedir password:

```bash
echo 'suvka ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart suvka' > /etc/sudoers.d/suvka
chmod 440 /etc/sudoers.d/suvka
```

---

## 3. Base de dados (2 min)

```bash
sudo -u postgres createuser suvka --pwprompt    # ANOTE a password
sudo -u postgres createdb suvka --owner=suvka
```

---

## 4. O código (2 min)

```bash
sudo -u suvka -H bash
cd /srv/suvka
git clone SEU-REPOSITORIO .
```

---

## 5. Segredos (5 min)

```bash
cp deploy/.env.production.example .env.production
nano .env.production          # preencher tudo
chmod 600 .env.production
```

O ficheiro de exemplo explica cada variável. Os quatro valores que as pessoas erram:

- **`APP_URL`** — o seu domínio, com `https://`. Sem ela o `next build` **recusa-se a
  correr**, de propósito: o endereço fica escrito no `<link rel="canonical">` das páginas
  estáticas, e um build sem ele grava lá `localhost`, o que diz ao Google para não indexar
  nenhuma delas. Tem de coincidir com a `AUTH_URL` — o arranque recusa se discordarem.
- **`AUTH_SECRET`** — gere um novo com `openssl rand -base64 32`. Nunca reutilize o de
  desenvolvimento: quem o tiver consegue forjar uma sessão para qualquer conta.
- **`STRIPE_PRICE_ID`** — tem de ser um Price criado no **modo live**. Um `price_` de teste
  não existe em live e o checkout falha com "No such price".
- **`SUVKA_UPLOADS_DIR`** — deixe em `/srv/suvka-uploads`. Se mudar, mude também o
  `Caddyfile` e o `backup.sh`.

---

## 6. Caddy e systemd (3 min)

Noutro terminal, como root:

```bash
# Editar o domínio e o email ANTES de copiar
nano /srv/suvka/deploy/Caddyfile
cp /srv/suvka/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy

cp /srv/suvka/deploy/suvka.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable suvka
```

---

## 7. O primeiro deploy (5 min)

De volta ao utilizador `suvka`:

```bash
cd /srv/suvka
chmod +x deploy/*.sh
./deploy/deploy.sh
```

O script instala, migra a base de dados, faz o build, reinicia e **verifica**. Se disser
`==> Online` seguido de `==> Tudo bem`, está no ar.

---

## 8. Stripe live (5 min)

No dashboard do Stripe, com o interruptor em **live**:

1. **Developers → API keys** → copiar `sk_live_…` e `pk_live_…` para o `.env.production`
2. **Products** → criar "Suvka Pro", 19 € recorrente mensal → copiar o `price_…`
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://SEU-DOMINIO.pt/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copiar o `whsec_…` para o `.env.production`

```bash
sudo systemctl restart suvka
```

O webhook **recusa todos os pedidos** enquanto `STRIPE_WEBHOOK_SECRET` não existir. É de
propósito: é público por necessidade e, sem assinatura verificada, quem souber o URL marca
qualquer cliente como pagante.

---

## 9. Cópias de segurança (2 min)

Como root:

```bash
cp /srv/suvka/deploy/backup.sh /usr/local/bin/suvka-backup
chmod +x /usr/local/bin/suvka-backup
crontab -e
```

```
15 4 * * * /usr/local/bin/suvka-backup
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

**O `deploy.sh` para no build a dizer `APP_URL em falta`**
É o que devia acontecer. Ponha `APP_URL="https://o-seu-dominio"` no `.env.production` e
volte a correr. O build parou antes de gravar `localhost` no canonical de todas as páginas
estáticas — o site que está online não foi tocado.

**Arranca e morre logo, a dizer que `APP_URL` não coincide com `AUTH_URL`**
São duas variáveis que têm de nomear o mesmo domínio. Uma diferença aqui punha as sessões
num domínio e o Google no outro.

**Não responde, e o `journalctl` diz `UntrustedHost`**
Falta `AUTH_URL` no `.env.production`, ou não coincide com o domínio real.

**O checkout dá 500**
`STRIPE_PRICE_ID` é de teste e as chaves são live, ou o contrário. Os dois têm de estar no
mesmo modo.

**As fotografias dão 404**
`SUVKA_UPLOADS_DIR` e o `root` do `Caddyfile` não apontam para o mesmo sítio, ou a pasta
não pertence ao utilizador `suvka`.

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
