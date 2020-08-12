import sys
import json
import datetime

if len(sys.argv) < 3:
    exit(1)

file1 = open(sys.argv[2], 'r')
Lines = file1.readlines()

dates = []
lastDateString = None
lastDate = None

for line in Lines:
    # print("Line{}: {}".format(count, line.strip()))
    log = json.loads(line.strip())
    # print(log[0])
    logTime = datetime.datetime.strptime(log[0], "%Y-%m-%dT%H:%M:%S.%fZ")
    # print(logTime)

    if lastDate is not None:
        gap = (logTime - lastDate).total_seconds()

        if gap > 2.5:
            dates.append(lastDateString)
            dates.append(log[0])
    else:
        dates.append(log[0])

    lastDateString = log[0]
    lastDate = logTime

dateString = ""

for i in range(0, len(dates), 2):
    if i + 1 < len(dates):
        dateString += "['" + sys.argv[1] + "', new Date('" + dates[i] + "'), new Date('" + dates[i + 1] +  "')], "

print(dateString)