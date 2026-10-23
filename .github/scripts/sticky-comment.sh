#!/usr/bin/env bash
# Creates or updates the one preview comment on a PR: the comment whose body starts with
# $MARKER. Usage: sticky-comment.sh <body>. Needs GH_TOKEN, GITHUB_REPOSITORY, PR and MARKER.
# curl + jq only: the self-hosted runner image has no gh CLI.
#
# Retries: GET and PATCH are idempotent and retry freely. POST does not: a POST that timed out
# may still have created the comment, so on failure we look for the marker again and PATCH that
# comment if it's there, POSTing again only if it isn't (never a duplicate preview comment).
set -euo pipefail
# Without this, `set -e` is off inside $(...): a failed comment lookup would read as "no comment"
# and post a duplicate.
shopt -s inherit_errexit
body=$1
case "$body" in "$MARKER"*) ;; *) echo "body must start with the marker" >&2; exit 2 ;; esac
api="${GITHUB_API_URL:-https://api.github.com}/repos/$GITHUB_REPOSITORY"
# The account the workflow's GITHUB_TOKEN posts as.
BOT_LOGIN="${STICKY_BOT_LOGIN:-github-actions[bot]}"
headers=(-H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json'
  -H 'X-GitHub-Api-Version: 2022-11-28')
retrying=(--retry 5 --retry-all-errors --retry-delay 5)
get() { curl -fsSL "${retrying[@]}" "${headers[@]}" "$1"; }
patch() { curl -fsSL "${retrying[@]}" "${headers[@]}" -X PATCH --data "$2" "$1"; }
post_once() { curl -fsSL --max-time 30 "${headers[@]}" -X POST --data "$2" "$1"; }

find_marker() {
  local page batch id
  for ((page = 1; ; page++)); do
    batch=$(get "$api/issues/$PR/comments?per_page=100&page=$page")
    [ "$(jq length <<< "$batch")" -gt 0 ] || return 0
    # Only the bot's own comment: a human comment that starts with the marker isn't ours to PATCH
    # (403), and a null body (deleted text) is treated as empty.
    id=$(jq -r --arg m "$MARKER" --arg bot "$BOT_LOGIN" \
      '[.[] | select(.user.login == $bot and ((.body // "") | startswith($m))) | .id][0] // empty' \
      <<< "$batch")
    if [ -n "$id" ]; then
      echo "$id"
      return 0
    fi
  done
}

payload=$(jq -n --arg b "$body" '{body: $b}')
id=$(find_marker)
if [ -n "$id" ]; then
  patch "$api/issues/comments/$id" "$payload" | jq -r .html_url
  exit 0
fi
for attempt in 1 2 3; do
  if out=$(post_once "$api/issues/$PR/comments" "$payload"); then
    jq -r .html_url <<< "$out"
    exit 0
  fi
  echo "POST failed (attempt $attempt of 3); checking whether it landed anyway" >&2
  sleep $((attempt * 5))
  id=$(find_marker)
  if [ -n "$id" ]; then
    patch "$api/issues/comments/$id" "$payload" | jq -r .html_url
    exit 0
  fi
done
echo "could not create the preview comment" >&2
exit 1
