#!/usr/bin/env bash
# Fail CI when private key material or signing bundles are committed.
set -euo pipefail

readonly self='scripts/secret-scan.sh'
readonly key_pattern='-----BEGIN ([A-Z0-9 ]+ )?PRIVATE KEY-----'
status=0

if matches=$(git grep -nI -E -- "$key_pattern" -- . ":(exclude)${self}"); then
  printf '%s\n' "$matches" >&2
  printf '::error::private key material is committed; remove it and rotate the key\n' >&2
  status=1
fi

signing_files=$(git ls-files -- '*.pem' '*.crx')
if [[ -n "$signing_files" ]]; then
  printf '%s\n' "$signing_files" >&2
  printf '::error::tracked signing artifacts (*.pem/*.crx) are not allowed\n' >&2
  status=1
fi

if [[ "$status" -eq 0 ]]; then
  echo 'secret scan: clean'
fi

exit "$status"
