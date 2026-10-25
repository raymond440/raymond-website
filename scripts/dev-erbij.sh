#!/bin/zsh
# Test ERBIJ afrekenen lokaal in de testmodus van Stripe. Er gaat niets live en er wordt geen mail echt verstuurd.
# Gebruik:  stripe login   (eenmalig, in je eigen terminal)   daarna:   scripts/dev-erbij.sh
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
command -v stripe >/dev/null || { echo "De Stripe CLI is niet gevonden."; exit 1; }
# De sleutel typ of plak je zelf in deze terminal (je ziet hem niet). Hij gaat alleen naar .dev.vars (staat in .gitignore).
# Dashboard: zet Stripe in testmodus, Developers, API keys, "Secret key" (sk_test_...).
echo -n "Plak je Stripe TESTsleutel (sk_test_...) en druk op Enter: "
read -rs KEY
echo ""
case "$KEY" in
  sk_test_*|rk_test_*) ;;
  *) echo "Dat is geen testsleutel. Gebruik hier nooit een live-sleutel."; exit 1 ;;
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
stripe listen --api-key "$KEY" --forward-to localhost:8787/api/erbij/webhook >/tmp/stripe-listen.log 2>&1 &
LISTEN=$!
trap 'kill $LISTEN 2>/dev/null; rm -f .dev.vars' EXIT INT TERM
echo ""
echo "Klaar. Open http://localhost:8787/erbij/ en bestel met testkaart 4242 4242 4242 4242 (elke toekomstige datum, elke cvc),"
echo "of kies iDEAL en daarna 'Authorize test payment'. De testmails staan op http://localhost:8787/api/erbij/dev-mails"
echo "Stoppen: Ctrl+C. Dan wordt .dev.vars ook weer verwijderd."
echo ""
npx wrangler dev --config wrangler.dev.jsonc --port 8787
