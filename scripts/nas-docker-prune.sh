#!/bin/sh
# FRE-351: removes dangling Docker images left behind by every Portainer
# "Pull and Redeploy" (which pulls a new :latest but never removes the old
# one). `docker image prune -f` only ever targets dangling images — by
# Docker's own design this can't remove an image still backing any
# container, running or stopped, so it's safe to run unattended on a
# schedule. Deliberately NOT `docker system prune -a` (would also remove the
# SHA-tagged images FRE-298 added, killing rollback targets) and NOT
# anything volume-related (pgdata/photos must never be touched by an
# unattended job).
#
# Wiring this up on the NAS (can't be done from this repo/CI — DSM Task
# Scheduler is configured directly on the Synology, not via anything
# deployed):
#   1. DSM → Control Panel → Task Scheduler → Create → Scheduled Task →
#      User-defined script
#   2. Schedule: e.g. weekly, low-traffic time
#   3. Task Settings → Run command: sh /path/to/this/script/on/the/nas.sh
#      (copy this file onto the NAS itself, e.g. via File Station — it does
#      not need to live inside a container or the deployed stack)
#   4. Run as a user with permission to run `docker` (typically root, or
#      whichever account is already used for the Portainer/Docker setup)

docker image prune -f
