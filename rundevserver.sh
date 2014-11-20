#!/bin/bash

source ./app-credentials.sh
if [ -f ./.env ]; then
  while read line; do
    export $line
  done < ./.env
fi
export PORT=3000 

cd server
if [ ! $? ]; then
  node-dev app.js
else
  nodemon app.js
fi

#node-dev app.js
#node app.js
