#!/bin/bash

mkdir -p build
node bundle.js
cp ../client/copyraptor.css build/

