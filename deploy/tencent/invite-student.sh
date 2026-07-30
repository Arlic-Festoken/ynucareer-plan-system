#!/usr/bin/env bash
set -Eeuo pipefail

candidate_email="${1:?usage: invite-student.sh <email>}"
env_file="/etc/career-navigation.env"
backup_file="${env_file}.bak-$(date +%Y%m%d-%H%M%S)"

if [[ ! "${candidate_email}" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Invalid invite email." >&2
  exit 2
fi

if [[ ! -f "${env_file}" ]]; then
  echo "Runtime environment file not found: ${env_file}" >&2
  exit 2
fi

cp -a "${env_file}" "${backup_file}"

rollback() {
  local exit_code=$?
  cp -a "${backup_file}" "${env_file}"
  systemctl restart career-navigation.service || true
  echo "Invite update failed; runtime configuration restored." >&2
  exit "${exit_code}"
}
trap rollback ERR

if grep -q '^CAREER_INVITED_EMAILS=' "${env_file}"; then
  current_value="$(sed -n 's/^CAREER_INVITED_EMAILS=//p' "${env_file}" | tail -n 1)"
  case ",${current_value}," in
    *",${candidate_email},"*) ;;
    *)
      if [[ -n "${current_value}" ]]; then
        replacement="CAREER_INVITED_EMAILS=${current_value},${candidate_email}"
      else
        replacement="CAREER_INVITED_EMAILS=${candidate_email}"
      fi
      sed -i "s|^CAREER_INVITED_EMAILS=.*$|${replacement}|" "${env_file}"
      ;;
  esac
else
  printf '\nCAREER_INVITED_EMAILS=%s\n' "${candidate_email}" >> "${env_file}"
fi

if ! grep -q '^REGISTRATION_MODE=' "${env_file}"; then
  printf 'REGISTRATION_MODE=invite\n' >> "${env_file}"
fi

chown root:root "${env_file}"
chmod 0600 "${env_file}"
systemctl restart career-navigation.service

health_json=""
for _ in {1..20}; do
  if health_json="$(curl -fsS --max-time 3 http://127.0.0.1:8795/healthz 2>/dev/null)"; then
    break
  fi
  sleep 1
done

HEALTH_JSON="${health_json}" node --input-type=module <<'NODE'
const health = JSON.parse(process.env.HEALTH_JSON);
if (
  health.status !== "ok" ||
  health.database !== "ready" ||
  health.schemaVersion !== 8 ||
  health.registrationMode !== "invite"
) {
  throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
}
NODE

trap - ERR
printf 'invited_email=%s\n' "${candidate_email}"
printf '%s\n' "${health_json}"
