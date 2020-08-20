#!/bin/bash

if [ -f $1 ];
then
 wc -l $1 | awk '{print $1;}'
else
  echo 0
fi