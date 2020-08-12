#!/bin/bash

instance_id=${1}

./scripts/stop.sh $instance_id

rm -rf data/instances/${instance_id}