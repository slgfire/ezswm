#!/bin/bash
# Usage: ./scripts/bump-version.sh 0.4.0
set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.4.0"
  exit 1
fi

# package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json

# nuxt.config.ts
sed -i "s/appVersion: '[^']*'/appVersion: '$VERSION'/" nuxt.config.ts

# README.md version badge
sed -i "s/Version-[0-9]*\.[0-9]*\.[0-9]*/Version-$VERSION/" README.md

echo "Bumped version to $VERSION in:"
echo "  - package.json"
echo "  - nuxt.config.ts"
echo "  - README.md"
