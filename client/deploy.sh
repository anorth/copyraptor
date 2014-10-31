#!/bin/sh

export AWS_DEFAULT_REGION=us-west-2

CREDENTIALS_FILE="../admin-credentials.sh"
CODE_BUCKET="s3://com.copyraptor.code"

if [ -f ${CREDENTIALS_FILE} ]
then
  echo "Loading credientials " ${CREDENTIALS_FILE}
  source ${CREDENTIALS_FILE}
else
  echo "Can't find" ${CREDENTIALS_FILE}
fi

aws s3 sync build ${CODE_BUCKET} --exclude "*.js.gz" --content-type "application/javascript"
aws s3 sync build ${CODE_BUCKET} --exclude "*" --include "*.js.gz" --content-type "application/javascript" --content-encoding="gzip"

echo "Done"
