#!/bin/bash

set -e

PROFNAME=$1

if [ "${PROFNAME}" == "" ]; then
  echo Specify a profile name to populate the test harness with.
  exit 1
fi

mkdir -p test/mock
# Create the profile.json for the EVERYAUTH_PROFILE_JSON
npx @fusebit/everyauth-cli profile export > test/mock/profile.json

# Create the jwt.json for the EVERYAUTH_TOKEN
npx @fusebit/everyauth-cli token -e 1w -o json > test/mock/jwt.json

# Create the profile directory
npx @fusebit/cli profile export ${PROFNAME} | (
  HOME=${PWD}/test/mock npx @fusebit/cli profile import
)
mv test/mock/.fusebit test/mock/profile
contents="$(jq '.defaults = {"profile": "'$PROFNAME'"}' test/mock/profile/settings.json)" && echo "${contents}" > test/mock/profile/settings.json

