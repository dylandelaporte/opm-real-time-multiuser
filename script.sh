#!/bin/bash

LanguageArray=("hiekata"  "imanaka"  "Yuyama"  "shirono"  "Kobayashi")

# Print array values in  lines
for val1 in ${LanguageArray[*]}; do
     cat /data/test.json | grep $val1 > "${val1}_logs.json"
     python python.py "${val1}" "${val1}_logs.json"
done