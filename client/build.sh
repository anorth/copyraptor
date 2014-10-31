#!/bin/bash

../node_modules/webpack/bin/webpack.js --optimize-minimize
gzip -9 --keep -f build/*.js build/*.css build/*.gif build/*.png
