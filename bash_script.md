### Make sure your github CLI connected to github, so it can do git pull without any confirmation
```
ssh -T git@github.com
```

### Make Script Executable
```
chmod +x bash_script.sh
```

### Add Cron Job (Run Every Day at 5PM)
```
crontab -e
```
```
0 17 * * * /PATH/TO/YOUR/BASH/APP/bash_script.sh >> /PATH/TO/YOUR/BASH/APP/bash_script.log 2>&1
```
#### Explaination
```
0 17 * * *
│ │
│ └── 17 = 5PM
└──── 0  = minute
Run daily at 17:00 (5PM)
Log output to deploy.log
Capture errors too
```