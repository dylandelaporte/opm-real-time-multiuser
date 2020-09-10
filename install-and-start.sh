#!/bin/bash

apt update
apt install apt-transport-https ca-certificates curl software-properties-common gnupg2 nodejs jq

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

cd admin/

mkdir -p data/database
mkdir -p data/instances

npm install
npm start
