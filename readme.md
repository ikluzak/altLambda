# QUICK START

* Install the package
```bash
    npm install altlambda --save-dev
````

* Add to package.json under scripts:
```json
    "altlambda" : "node node_modules/altlambda"
```

* Copy the sample config file into current folder
```bash
    cp node_modules/altlambda/altlambda.json ./
```

* Configure your lambdas and run it...

```bash
	npm run altlambda
```

* Should start listening on port 8000 or whatever you changed it to (in the index file currently, will be the altlambda.cfg in the near future)
	
### test by browsing to included test function:

http://localhost:8000/test

See lambda run
run lambda run!

NOTE: 
    altlambda.json  - is your configuration file...
    you will need a config section per api/lambda combo you want


### TODO NOTES/LOG: 

- [X] - override console.log() 
- [X] - create log streams for each lambda... 
- [ ] - Apart from the sandbox escapes, it was also possible to create a denial of service using infinite while loop
- [ ] - Set maxtimeout for the lambdas... and "freeze" them... or whatever...
- [ ] - Because i'm not doing real VM's per se... I can't freeze/thaw them.. exactly like AWS...  consider alternatives.. potentially use Docker containers per lambda... 

### Other thoughts...
	
- [ ] - Memory limits/max ram? 
- [ ] - Disk limits? 
- [ ] - Read only FS? 
- [ ] - Do I need to put this in Docker instead? 
- [ ] - Simulate Layers??? 
- [ ] - Max execution time... from an API gateway perspective as well separate from Lambda
- [ ] - Specify alternative start functions instead of index.handler
- [X] - Override the console.log and get in a file...
- [X] - Add simulated cold start delay... (simulated) 
- [ ] - Parameterize the cold start delay


