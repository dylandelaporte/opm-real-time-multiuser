#!/bin/bash

apt update
apt install apt-transport-https ca-certificates curl software-properties-common gnupg2

curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -

add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"

apt update
apt install docker-ce

docker swarm init

DATA_DIR=/opt/opmmodel

mkdir -p $DATA_DIR
chmod 777 $DATA_DIR

env DATA_DIR=${DATA_DIR} docker stack deploy --compose-file docker-compose.yml opmmodel