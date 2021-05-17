#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

test -z "${HOPR_GITHUB_REF:-}" && (echo "Missing environment variable HOPR_GITHUB_REF"; exit 1)

# ensure local copy is up-to-date with origin
git pull origin "${HOPR_GITHUB_REF}"

# create new version in each package, and tag in Git
yarn lerna version patch --yes --exact --no-push --no-changelog

# only make remote changes if running in CI
if [ -n "${HOPR_IN_CI:-}" ]; then
  # push changes back onto origin including new tag
  git push origin "${HOPR_GITHUB_REF}" --tags

  # publish version to npm
  yarn lerna publish from-package --yes
fi
