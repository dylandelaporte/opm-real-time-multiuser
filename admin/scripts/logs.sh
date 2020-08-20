#!/bin/bash

instance_id=${1}

if [ "$(docker stack services $instance_id 2>/dev/null)a" = "a" ]
then
  echo '{"error": "Unable to find the instance"}'
else
  echo "$(docker stack services $instance_id | tail -n +2 | awk '{print $1;}')" | while read service_id; do
    name=$(docker service inspect $service_id --pretty | grep Name: | awk '{print $2}')
    logs=$(docker service logs $service_id --tail 5 --raw --timestamps 2/>dev/null)

    echo $(jq -n --arg name $name --arg logs "$logs" '{name: $name, logs: $logs}')
  done | jq -s '{services: [.[]]}'
fi