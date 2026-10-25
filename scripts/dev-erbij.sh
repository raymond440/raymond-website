#!/bin/zsh
# Test ERBIJ afrekenen lokaal in de testmodus van Stripe. Er gaat niets live en er wordt geen mail echt verstuurd.
# Gebruik:  stripe login   (eenmalig, in je eigen terminal)   daarna:   scripts/dev-erbij.sh
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
command -v stripe >/dev/null || { echo "De Stripe CLI is niet gevonden."; exit 1; }
# De testsleutel staat in .dev.vars (regel STRIPE_SECRET_KEY=, door jou ingevuld, gitignored). Staat hij daar niet, dan vraagt het script erom.
KEY=""
[ -f .dev.vars ] && KEY=$(sed -n 's/^STRIPE_SECRET_KEY=\(.*\)$/\1/p' .dev.vars | head -1)
if [ -z "$KEY" ]; then
  echo -n "Plak je Stripe TESTsleutel (sk_test_...) en druk op Enter: "
  read -rs KEY
  echo ""
fi
case "$KEY" in
  sk_test_*|rk_test_*) ;;
  *) echo "Dat is geen testsleutel. Vul in .dev.vars een sleutel in die met sk_test_ begint. Gebruik hier nooit een live-sleutel."; exit 1 ;;
esac
WHSEC=$(stripe listen --print-secret --api-key "$KEY")
umask 077
cat > .dev.vars <<VARS
STRIPE_SECRET_KEY=$KEY
STRIPE_WEBHOOK_SECRET=$WHSEC
ERBIJ_TOKEN_SECRET=$(openssl rand -hex 24)
MAIL_DRY_RUN=1
VARS
CONCEPTEN=1 npm run build
stripe listen --api-key "$KEY" --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:8787/api/erbij/webhook >/tmp/stripe-listen.log 2>&1 &
LISTEN=$!
trap 'kill $LISTEN 2>/dev/null' EXIT INT TERM
echo ""
echo "Klaar. Open http://localhost:8787/erbij/ en bestel met testkaart 4242 4242 4242 4242 (elke toekomstige datum, elke cvc),"
echo "of kies iDEAL en daarna 'Authorize test payment'. De testmails staan op http://localhost:8787/api/erbij/dev-mails"
echo "Stoppen: Ctrl+C. .dev.vars blijft staan (gitignored); verwijder het als je klaar bent."
echo ""
npx wrangler dev --config wrangler.dev.jsonc --port 8787
