#!/bin/bash

instance_id=${1}

if [ "$(docker stack services $instance_id 2>/dev/null)a" = "a" ]
then
  echo '{"error": "Unable to find the instance"}'
else
  echo "$(docker stack services $instance_id | tail -n +2 | awk '{print $1;}')" | while read service_id; do
    name=$(docker service inspect $service_id --pretty | grep Name: | awk '{print $2}')
    state=$(docker service ps $service_id | sed -n 2p | awk '{print $6;}')

    echo $(jq -n --arg name $name --arg state $state '{name: $name, state: $state}')
  done | jq -s '{services: [.[]]}'
fi