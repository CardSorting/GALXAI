#!/usr/bin/env bash
set -euo pipefail

# Safe-by-default DigitalOcean provisioner. It creates only the Droplet; host
# firewall, DNS, TLS, image loading and database gates are separate steps.

INPUT_PATH="${1:?Usage: $0 deploy/digitalocean/droplet-input.json [--plan|--apply]}"
MODE="${2:---plan}"
if [[ "$MODE" != "--plan" && "$MODE" != "--apply" ]]; then
  echo "Mode must be --plan or --apply." >&2
  exit 2
fi
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
command -v doctl >/dev/null || { echo "doctl is required and must already be authenticated." >&2; exit 1; }

read_value() {
  jq -er "$1" "$INPUT_PATH"
}

PROVIDER="$(read_value '.provider')"
NAME="$(read_value '.name')"
REGION="$(read_value '.region')"
PROFILE="$(read_value '.profile')"
SIZE="$(read_value '.size')"
IMAGE="$(read_value '.image')"
SSH_KEY_ID="$(read_value '.sshKeyId')"
TAGS="$(jq -er '.tags | map(strings) | join(",")' "$INPUT_PATH")"

[[ "$PROVIDER" == "digitalocean" ]] || { echo "provider must be digitalocean." >&2; exit 1; }
[[ "$REGION" == "sfo3" ]] || { echo "This reviewed deployment contract uses DigitalOcean sfo3." >&2; exit 1; }
[[ "$NAME" =~ ^[a-z0-9][a-z0-9-]{0,62}$ ]] || { echo "name must be a DNS-safe Droplet name." >&2; exit 1; }
[[ "$SSH_KEY_ID" != *REPLACE_WITH* ]] || { echo "Replace sshKeyId before provisioning." >&2; exit 1; }
[[ "$IMAGE" == "ubuntu-24-04-x64" ]] || { echo "The reviewed host image is ubuntu-24-04-x64." >&2; exit 1; }

case "$PROFILE" in
  one-desktop) expected_size="s-4vcpu-8gb-amd" ;;
  three-desktop) expected_size="s-8vcpu-16gb-amd" ;;
  *) echo "profile must be one-desktop or three-desktop." >&2; exit 1 ;;
esac
[[ "$SIZE" == "$expected_size" ]] || {
  echo "size $SIZE does not match profile $PROFILE; expected $expected_size." >&2
  exit 1
}

if jq -e '.sshAllowCidrs | type == "array" and length > 0 and all(.[]; type == "string" and . != "0.0.0.0/0" and . != "::/0" and (contains("REPLACE_WITH") | not))' "$INPUT_PATH" >/dev/null; then
  :
else
  echo "sshAllowCidrs must contain reviewed, non-global operator CIDRs." >&2
  exit 1
fi

# These checks ask the provider for current availability instead of assuming a
# size slug will remain offered in every account or region. `doctl` exposes
# these as list endpoints, so use exact-row matches rather than guessing at a
# point lookup subcommand.
available_regions="$(doctl compute region list --format Slug --no-header)"
awk -v wanted="$REGION" '$1 == wanted { found = 1 } END { exit found ? 0 : 1 }' <<< "$available_regions" || {
  echo "DigitalOcean region $REGION is not available to this account." >&2
  exit 1
}
available_sizes="$(doctl compute size list --format Slug --no-header)"
awk -v wanted="$SIZE" '$1 == wanted { found = 1 } END { exit found ? 0 : 1 }' <<< "$available_sizes" || {
  echo "DigitalOcean size $SIZE is not currently available to this account." >&2
  exit 1
}
available_images="$(doctl compute image list --public --format Slug --no-header)"
awk -v wanted="$IMAGE" '$1 == wanted { found = 1 } END { exit found ? 0 : 1 }' <<< "$available_images" || {
  echo "DigitalOcean image $IMAGE is not currently available." >&2
  exit 1
}

existing_id="$(doctl compute droplet list --format ID,Name --no-header | awk -v name="$NAME" '$2 == name {print $1; exit}')"
if [[ -n "$existing_id" ]]; then
  echo "A Droplet named $NAME already exists (id $existing_id); refusing to create another." >&2
  exit 1
fi

echo "DigitalOcean plan"
echo "  name:    $NAME"
echo "  region:  $REGION"
echo "  profile: $PROFILE"
echo "  size:    $SIZE"
echo "  image:   $IMAGE"
echo "  flags:   backups, monitoring, IPv6, private networking"
echo "  tags:    $TAGS"

if [[ "$MODE" == "--plan" ]]; then
  echo "No Droplet created (plan mode)."
  exit 0
fi

doctl compute droplet create "$NAME" \
  --region "$REGION" \
  --size "$SIZE" \
  --image "$IMAGE" \
  --ssh-keys "$SSH_KEY_ID" \
  --enable-backups \
  --enable-ipv6 \
  --enable-monitoring \
  --enable-private-networking \
  --tag-names "$TAGS" \
  --wait

echo "Droplet created. Continue with the DigitalOcean host procedure; do not open relay ports or the service gates yet."
