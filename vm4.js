const uuid            = require('uuid').v4;
const Script          = require('vm').Script;
const createContext   = require('vm').createContext;
const fs              = require('fs');
const process         = require('process');

const COLD_START_DELAY= 250;    // Default cold-start delay added in
const _old = console;           // Save a reference to 'console'

//
// Function to override the console logs so we can have the lambda function
// log out to a logfile instead...
//
function overrideLog(logname) {
	console = {};
	console.log = function (...args) {

		var str = `${new Date().toString()}: `;
		for (var i=0; i < args.length; i++) {
			str += `${args[i]}`;
		}

		fs.appendFileSync(`logs/${logname}.log`, str);
		fs.appendFileSync(`logs/${logname}.log`, '\n');

	}
}

//
// Function to revert back again to the "real" console.log for the rest of our app to use... 
function revertLog() {
	console = _old;
}

//
//
async function invokeLambda(lambda_name, context, use_path) {

    console.log(`\taltLambda()->START`);

    // Create an execution context object to pass in to the vm
    let contextObj = {
        console,
        require,
        _context : context
    };

    const vmContext = createContext(contextObj);
    const taskId = uuid();                                  // TODO: does this need to match the APIgw ID? 
    overrideLog(lambda_name);                               // LOG OVERRIDE

    //
    // ------------------------------------------------------------------------------------
    // LAMBDA LAND:

    console.log(`START RequestId: ${taskId} Version: $LATEST`);
    const start = Date.now();
    const startMem = process.memoryUsage().rss;             // TODO: double-check this is the memory stat we want

    // simulate some cold-start delay 
    await new Promise(resolve => setTimeout(resolve, COLD_START_DELAY));

    try {

        const script = new Script(`
            var lambda = require('./${use_path}/index.js').handler;
            lambda(_context);
        `);

        // Execute the lambda with the provide context
        var out = script.runInContext(vmContext);

    } catch (e) {
        // On error, try to fail somewhat gracefully
        console.log(e);
        out = { statusCode: 500, body: e.toString() };
    }

    const endMem = process.memoryUsage().rss;
    const end = Date.now();
    const duration = end-start;
    console.log(`REPORT RequestId: ${taskId}	Duration: ${duration} ms	Billed Duration: ${duration} ms	Memory Size: 'unlimited' MB	Max Memory Used: ${((endMem-startMem)/(1024*1024)).toPrecision(2)} MB`);


    // NOW LEAVING LAMBDA LAND:
    // ------------------------------------------------------------------------------------
    //
    //

    revertLog();
    console.log(`\taltLambda()->END`);

	return out;
}

module.exports = invokeLambda;
