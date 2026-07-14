#!/bin/sh
set -e

# The `photos` named volume predates the non-root USER change (FRE-331) and
# was created under a root-running container, so its on-disk ownership can't
# be fixed by anything baked into the image at build time — a fresh chown
# here, before dropping privileges, is what makes this safe to deploy against
# the volume that's already attached in production, not just a new one.
chown -R node:node "${UPLOAD_DIR:-/data/photos}"

exec su-exec node "$@"
