#!/bin/bash

set -e

PROFNAME=$1

if [ "${PROFNAME}" == "" ]; then
  echo Specify a profile name to populate the test harness with.
  exit 1
fi

mkdir -p test/mock
npx @fusebit/cli profile get --includeCredentials -o json ${PROFNAME} > test/mock/profile.json

# Create the profile directory
npx @fusebit/cli profile export ${PROFNAME} | (
  HOME=${PWD}/test/mock fuse profile import
)
mv test/mock/.fusebit test/mock/profile
contents="$(jq '.defaults = {"profile": "'$PROFNAME'"}' test/mock/profile/settings.json)" && echo "${contents}" > test/mock/profile/settings.json

