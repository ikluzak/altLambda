QUICK START:

	// From this npm module..
	
		-uh hang tight, something like...

			npm install altlambda --save-dev

		add to package.json under scripts:

			"altlambda" : "node node_modules/altlambda"

		Copy the sample config file into current folder

			cp node_modules/altlambda/altlambda.json ./

		Configure your lambdas and run it...

			npm run altlambda


	// From github...

		npm install         ( get the dependencies ) 
		node index.js       ( run the thing ) 

	Should start listening on port 8000 or whatever you changed it to
	
	test by browsing to:

		http://localhost:8000/test

	See lambda run
	run lambda run!

    NOTE: 
        altlambda.json  - is your configuration file...
                          you will need a config section per api/lambda combo you want

TODO NOTES/LOG: 

[*] - override console.log() 

[*] - create log streams for each lambda... 

[ ] - Apart from the sandbox escapes, it was also possible to create a denial of service using infinite while loop
	- TODO: set maxtimeout for the lambdas... and "freeze" them... or whatever...

[ ] - Because i'm not doing real VM's per se... I can't freeze/thaw them.. exactly like AWS...  consider alternatives...
      potentially use Docker containers per lambda... 


Other thoughts...
	
1. Memory limits/max ram? 
2. Disk limits? 
3. Read only FS? 
4. Do I need to put this in Docker instead? 
5. Layers??? 
6. Max execution time... 
7. Specify alternative start functions instead of index.handler
8. override the console.log and get in a file...

[*] - add simulated cold start delay... (simulated) 

[ ] - parameterize the cold start delay
