#!/bin/bash

instance_id=${1}

docker stack rm $instance_id 2>/dev/null