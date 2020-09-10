#!/bin/bash

apt update
apt install apt-transport-https ca-certificates curl software-properties-common gnupg2

if ! docker -v >/dev/null 2>&1
then
	curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -

	add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"

	apt update
	apt install docker-ce
fi

if ! docker swarm ca >/dev/null
then
	docker swarm init
fi

DATA_DIR=/opt/opmmodel

mkdir -p $DATA_DIR
chmod 777 $DATA_DIR

env DATA_DIR=${DATA_DIR} docker stack deploy --compose-file admin/docker-compose.yml opmmodel
