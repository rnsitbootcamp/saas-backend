#!/bin/bash
PROJECT_FOLDER=/home/ubuntu/ProductBackend/
error(){
    if [ $1 -ne 0 ]; then
        echo "[ERROR]: $2"
        exit $1
    fi
    return $1
}

npm ci
error $? "Error in npm install"
npm run build
error $? "Error in build"
npm run docs
error $? "Error in building docs"
rsync -ai --progress ./ $PROJECT_FOLDER --exclude .git --exclude src
error $? "Error in rsync"
rm -rf node_modules
cd $PROJECT_FOLDER && npm start
error $? "Error in npm start"

sleep 3

pm2 logs ProductAPI --lines 20 --nostream --raw

exit 0