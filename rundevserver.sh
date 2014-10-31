#!/bin/bash

source ./app-credentials.sh
export PORT=3000 

cd server
which nodemon
if [ $? ]; then
  node-dev app.js
fi

#node-dev app.js
#node app.js
