#!/bin/bash

instance_id=${1}
core_port=${2}
gui_port=${3}

dir=$(pwd)/data/instances/${instance_id}
data_dir=${dir}/data
deployment_dir=${DATA_DIR}/instances/${instance_id}/data
deployment_file=${dir}/deployment.yml

mkdir -p $dir
mkdir -p $data_dir

sed_data_dir=$(echo $deployment_dir | sed 's_/_\\/_g')

echo $sed_data_dir

sed "s/{CORE_PORT}/${core_port}/g; s/{GUI_PORT}/${gui_port}/g; s/{DIR}/${sed_data_dir}/g" \
configurations/deployment.yml > $deployment_file

docker stack deploy --compose-file $deployment_file $instance_id