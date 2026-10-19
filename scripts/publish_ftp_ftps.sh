#!/usr/bin/env bash
# Publish ONLY data/live/current.json, not the website or proof JSONs.
# Requires lftp and explicit TLS (fails rather than sending passwords in cleartext).
set -euo pipefail
for name in FTP_SERVER FTP_USERNAME FTP_PASSWORD FTP_REMOTE_DIR; do
  if [[ -z "${!name:-}" ]]; then echo "Missing secret: $name" >&2; exit 2; fi
done
command -v lftp >/dev/null || { echo 'lftp is required' >&2;exit 2; }
# Avoid command and secret echoing; the runner is a PRIVATE repository.
# Directory must be the existing Porkbun site directory ending /data/live.
remote="${FTP_REMOTE_DIR}"
[[ "$remote" =~ ^/?[A-Za-z0-9_./-]+$ && "$remote" != *..* ]] || { echo 'Unsafe remote directory' >&2;exit 2; }
server="$FTP_SERVER";[[ "$server" =~ ^[A-Za-z0-9.-]+$ ]] || { echo 'Invalid server hostname' >&2;exit 2; }
port="${FTP_PORT:-21}"
[[ "$port" =~ ^[0-9]+$ ]] || { echo 'Invalid FTP_PORT' >&2;exit 2; }
# Credentials are retrieved at runtime from GitHub Secrets.
# lftp command file is transient. The remote rename is used to avoid partial JSON reads.
lftp -f /dev/stdin <<EOF
set cmd:fail-exit true
set ssl:verify-certificate yes
set ftp:ssl-allow yes
set ftp:ssl-force yes
set ftp:ssl-protect-data yes
set ftp:passive-mode yes
set net:max-retries 2
set net:timeout 20
set xfer:clobber yes
open -p $port -u "$FTP_USERNAME","$FTP_PASSWORD" "$server"
cd "$remote"
put "data/live/current.json" -o "current.json.next"
mv "current.json.next" "current.json"
bye
EOF
echo 'Published current.json via TLS and server-side rename. No site files altered.'
