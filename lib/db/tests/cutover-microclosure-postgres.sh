#!/usr/bin/env bash
set -euo pipefail

# Test-only reproduction. It creates a fresh PostgreSQL cluster under /tmp,
# connects only through that cluster's private Unix socket, and removes it on
# exit. It deliberately unsets all PostgreSQL connection variables and never
# reads DATABASE_URL.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL initdb is required to run this local-only test." >&2
  exit 2
fi

PG_BIN_DIR="${PG_BIN_DIR:-$(dirname "$(command -v initdb)")}"
for tool in initdb pg_ctl createdb psql; do
  if [[ ! -x "$PG_BIN_DIR/$tool" ]]; then
    echo "Missing PostgreSQL tool: $PG_BIN_DIR/$tool" >&2
    exit 2
  fi
done

unset DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

TEMP_ROOT="$(mktemp -d /tmp/tabyan-cutover-microclosure.XXXXXX)"
DATA_DIR="$TEMP_ROOT/data"
SOCKET_DIR="$TEMP_ROOT/socket"
PORT=5432
DB_NAME=tabyan_cutover_microclosure
DB_USER="$(id -un)"
mkdir -p "$SOCKET_DIR"

cleanup() {
  local status=$?
  "$PG_BIN_DIR/pg_ctl" -D "$DATA_DIR" -m immediate -w stop >/dev/null 2>&1 || true
  if [[ $status -ne 0 && -f "$TEMP_ROOT/postgres.log" ]]; then
    echo "--- disposable PostgreSQL log ---" >&2
    tail -80 "$TEMP_ROOT/postgres.log" >&2
  fi
  rm -rf "$TEMP_ROOT"
  return "$status"
}
trap cleanup EXIT

"$PG_BIN_DIR/initdb" \
  -D "$DATA_DIR" \
  --username="$DB_USER" \
  --no-sync \
  --no-locale \
  --encoding=UTF8 \
  --auth-local=trust \
  --auth-host=reject \
  >"$TEMP_ROOT/initdb.log"

"$PG_BIN_DIR/pg_ctl" \
  -D "$DATA_DIR" \
  -l "$TEMP_ROOT/postgres.log" \
  -o "-F -k '$SOCKET_DIR' -p $PORT -c listen_addresses=''" \
  -w start

"$PG_BIN_DIR/createdb" \
  --host="$SOCKET_DIR" \
  --port="$PORT" \
  --username="$DB_USER" \
  "$DB_NAME"

PSQL=(
  "$PG_BIN_DIR/psql"
  --no-psqlrc
  --host="$SOCKET_DIR"
  --port="$PORT"
  --username="$DB_USER"
  --dbname="$DB_NAME"
)

"${PSQL[@]}" --set=ON_ERROR_STOP=1 \
  --file="$SCRIPT_DIR/fixtures/cutover-microclosure-fixture.sql"
echo "PASS: synthetic historical-media classification/backfill cases"

set +e
FAILURE_OUTPUT="$(
  "${PSQL[@]}" --set=ON_ERROR_STOP=off 2>&1 <<'SQL'
\set VERBOSITY terse
BEGIN;
ALTER TABLE sessions DROP CONSTRAINT sessions_student_id_students_user_id_fk;
DO $$ BEGIN RAISE EXCEPTION 'cutover_failure_probe'; END $$;
ROLLBACK;
SQL
)"
FAILURE_STATUS=$?
set -e

if ! grep -Fq "cutover_failure_probe" <<<"$FAILURE_OUTPUT"; then
  echo "Expected the injected failure after dropping the FK; psql status=$FAILURE_STATUS" >&2
  echo "$FAILURE_OUTPUT" >&2
  exit 1
fi

"${PSQL[@]}" --set=ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'sessions'::regclass
      AND conname = 'sessions_student_id_students_user_id_fk'
      AND confdeltype = 'c'
  ) THEN
    RAISE EXCEPTION 'Rollback did not restore the original CASCADE foreign key';
  END IF;
  IF (SELECT count(*) FROM students) <> (SELECT count(*) FROM cutover_before_students)
     OR (SELECT count(*) FROM sessions) <> (SELECT count(*) FROM cutover_before_sessions) THEN
    RAISE EXCEPTION 'Rows changed during the failed migration transaction';
  END IF;
END $$;
SQL
echo "PASS: injected failure rolled back and restored the original FK"

"${PSQL[@]}" --set=ON_ERROR_STOP=1 \
  --file="$SCRIPT_DIR/fixtures/cutover-microclosure-success.sql"
echo "PASS: successful FK replacement preserved rows, values, nullability, and indexes"
echo "PASS: deleting the disposable student applied SET NULL without deleting sessions"
echo "PASS: disposable PostgreSQL cluster stopped and removed on exit"
