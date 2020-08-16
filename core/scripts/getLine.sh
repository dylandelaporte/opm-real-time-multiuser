#!/bin/bash

if [ -f $1 ];
then
  tail -n+${2} $1 | head -n1
fi