#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — CI/CD deployment script for Kord (Pitch Correction App)
#  Usage:  ./deploy.sh [--no-cache] [--branch <branch>]
# =============================================================================

set -euo pipefail

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ─── Config ───────────────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${BRANCH:-main}"
NO_CACHE=""
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

BACKEND_URL="http://localhost:8000/docs"
FRONTEND_URL="http://localhost:3000/"
HEALTH_RETRIES=15
HEALTH_INTERVAL=4   # seconds between retries

# ─── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache)   NO_CACHE="--no-cache"; shift ;;
    --branch)     BRANCH="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--no-cache] [--branch <name>]"
      exit 0 ;;
    *) error "Unknown argument: $1"; exit 1 ;;
  esac
done

# ─── Rollback helpers ─────────────────────────────────────────────────────────
PREVIOUS_IMAGES=()

save_image_ids() {
  # Save current image IDs so we can roll back if the new build fails
  PREVIOUS_IMAGES=($(docker compose -f "$COMPOSE_FILE" images -q 2>/dev/null || true))
}

rollback() {
  error "Deployment failed — rolling back..."
  error "Last 50 lines of container logs:"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
  if [[ ${#PREVIOUS_IMAGES[@]} -gt 0 ]]; then
    warn "Previous images were: ${PREVIOUS_IMAGES[*]}"
    warn "Manually restore with: docker compose up -d (if images still exist)"
  fi
  exit 1
}
trap rollback ERR

# ─── Pre-flight checks ────────────────────────────────────────────────────────
preflight() {
  info "Running pre-flight checks..."
  command -v docker       >/dev/null 2>&1 || { error "docker not found"; exit 1; }
  command -v git          >/dev/null 2>&1 || { error "git not found";    exit 1; }
  [[ -f "$COMPOSE_FILE" ]] || { error "docker-compose.yml not found at $APP_DIR"; exit 1; }
  success "Pre-flight passed"
}

# ─── Pull latest code ─────────────────────────────────────────────────────────
pull_code() {
  info "Pulling latest code from branch '${BRANCH}'..."
  cd "$APP_DIR"
  git fetch --all --prune
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  GIT_SHA=$(git rev-parse --short HEAD)
  success "Code up to date — commit: ${BOLD}${GIT_SHA}${RESET}"
}

# ─── Build & deploy (atomic — minimises downtime) ─────────────────────────────
build_and_deploy() {
  info "Building and deploying${NO_CACHE:+ (--no-cache)}..."
  cd "$APP_DIR"
  save_image_ids
  docker compose -f "$COMPOSE_FILE" up -d --build $NO_CACHE --remove-orphans
  success "Build + deploy complete"
}

# ─── Health checks ────────────────────────────────────────────────────────────
wait_healthy() {
  local url="$1"
  local name="$2"
  info "Waiting for ${name} to become healthy (${url})..."
  local i=0
  until curl -sf "$url" > /dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -ge $HEALTH_RETRIES ]]; then
      error "${name} did not become healthy after $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
      docker compose -f "$COMPOSE_FILE" logs --tail=40
      return 1
    fi
    echo -n "."
    sleep "$HEALTH_INTERVAL"
  done
  echo ""
  success "${name} is healthy ✓"
}

health_check() {
  wait_healthy "$BACKEND_URL"  "Backend  (FastAPI)"
  wait_healthy "$FRONTEND_URL" "Frontend (nginx)"
}

# ─── Clean up dangling images ─────────────────────────────────────────────────
cleanup() {
  info "Pruning dangling images..."
  docker image prune -f --filter "dangling=true" > /dev/null
  success "Cleanup done"
}

# ─── Summary ──────────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${GREEN}${BOLD}  ✅  Deployment complete${RESET}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "  App:      ${CYAN}http://$(curl -sf http://checkip.amazonaws.com/ 2>/dev/null || echo '<EC2-IP>'):3000${RESET}"
  echo -e "  API docs: ${CYAN}http://$(curl -sf http://checkip.amazonaws.com/ 2>/dev/null || echo '<EC2-IP>'):8000/docs${RESET}"
  echo -e "  Commit:   ${BOLD}${GIT_SHA:-unknown}${RESET}"
  echo -e "  Branch:   ${BOLD}${BRANCH}${RESET}"
  echo ""
  docker compose -f "$COMPOSE_FILE" ps
}

# ─── Main ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ██╗  ██╗ ██████╗ ██████╗ ██████╗ "
echo "  ██║ ██╔╝██╔═══██╗██╔══██╗██╔══██╗"
echo "  █████╔╝ ██║   ██║██████╔╝██║  ██║"
echo "  ██╔═██╗ ██║   ██║██╔══██╗██║  ██║"
echo "  ██║  ██╗╚██████╔╝██║  ██║██████╔╝"
echo "  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ "
echo -e "  Pitch Correction — Deploy Script${RESET}"
echo ""

GIT_SHA=""

preflight
pull_code
build_and_deploy
health_check
cleanup
print_summary
