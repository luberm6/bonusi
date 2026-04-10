#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
exec /usr/local/bin/node /usr/local/bin/npx -y @_davideast/stitch-mcp "$@"
