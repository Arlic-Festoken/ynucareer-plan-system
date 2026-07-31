#!/usr/bin/env bash
set -Eeuo pipefail

archive_path="${1:?usage: deploy-release.sh <archive-path> <release-id>}"
release_id="${2:?usage: deploy-release.sh <archive-path> <release-id>}"
app_root="/opt/career-navigation"
release_path="${app_root}/releases/${release_id}"
shared_path="${app_root}/shared"
current_link="${app_root}/current"
previous_release=""
switched="false"

if [[ ! "${release_id}" =~ ^[0-9]{8}-[0-9]{6}-v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid release id: ${release_id}" >&2
  exit 2
fi

if [[ ! -f "${archive_path}" ]]; then
  echo "Release archive not found: ${archive_path}" >&2
  exit 2
fi

if [[ -L "${current_link}" ]]; then
  previous_release="$(readlink -f "${current_link}")"
fi

rollback() {
  local exit_code=$?
  if [[ "${switched}" == "true" && -n "${previous_release}" && -d "${previous_release}" ]]; then
    ln -sfn "${previous_release}" "${current_link}"
    systemctl restart career-navigation.service || true
  fi
  echo "Release failed; previous version restored." >&2
  exit "${exit_code}"
}
trap rollback ERR

install -d -m 0755 "${app_root}/releases"
install -d -m 0750 -o career-nav -g career-nav "${shared_path}"
install -d -m 0750 -o career-nav -g career-nav "${shared_path}/backups"

if [[ -e "${release_path}" ]]; then
  echo "Release already exists: ${release_path}" >&2
  exit 2
fi

install -d -m 0755 "${release_path}"
tar -xzf "${archive_path}" -C "${release_path}"

if [[ ! -f "${release_path}/public/index.html" ||
      ! -f "${release_path}/server/index.mjs" ||
      ! -f "${release_path}/package-lock.json" ]]; then
  echo "Release archive is incomplete." >&2
  exit 2
fi

(
  cd "${release_path}"
  if [[ -d node_modules ]]; then
    npm ls --omit=dev --no-audit --no-fund
    node --input-type=module <<'NODE'
import Database from "better-sqlite3";

const database = new Database(":memory:");
database.prepare("SELECT 1 AS ready").get();
database.close();
NODE
    echo "Bundled production dependencies validated."
  else
    npm ci --omit=dev --no-audit --no-fund
  fi
)

if [[ -n "${previous_release}" && -f "${shared_path}/career.db" ]]; then
  backup_path="${shared_path}/backups/career-${release_id}.db"
  (
    cd "${previous_release}"
    DATABASE_PATH="${shared_path}/career.db" BACKUP_PATH="${backup_path}" node --input-type=module <<'NODE'
import Database from "better-sqlite3";

const database = new Database(process.env.DATABASE_PATH);
await database.backup(process.env.BACKUP_PATH);
const integrity = database.pragma("integrity_check", { simple: true });
database.close();

if (integrity !== "ok") {
  throw new Error(`SQLite integrity check failed before release: ${integrity}`);
}
NODE
  )
  chown career-nav:career-nav "${backup_path}"
  chmod 0640 "${backup_path}"
fi

chown -R root:root "${release_path}"
find "${release_path}" -type d -exec chmod 0755 {} +
find "${release_path}" -type f -exec chmod 0644 {} +

ln -sfn "${release_path}" "${current_link}"
switched="true"

systemctl restart career-navigation.service

for _ in {1..30}; do
  if health_json="$(curl -fsS --max-time 3 http://127.0.0.1:8795/healthz 2>/dev/null)"; then
    HEALTH_JSON="${health_json}" node --input-type=module <<'NODE'
const health = JSON.parse(process.env.HEALTH_JSON);
if (health.status !== "ok" || health.database !== "ready" || health.schemaVersion !== 8) {
  throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
}
NODE
    break
  fi
  sleep 1
done

health_json="$(curl -fsS --max-time 5 http://127.0.0.1:8795/healthz)"
HEALTH_JSON="${health_json}" node --input-type=module <<'NODE'
const health = JSON.parse(process.env.HEALTH_JSON);
if (health.status !== "ok" || health.database !== "ready" || health.schemaVersion !== 8) {
  throw new Error(`Release health check failed: ${JSON.stringify(health)}`);
}
NODE

nginx -t
systemctl reload nginx
trap - ERR

printf '%s\n' "${health_json}"
printf 'release=%s\n' "${release_id}"
printf 'previous=%s\n' "${previous_release}"
