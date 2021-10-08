var uuid = require('uuid').v4;
var Script = require('vm').Script;
var createContext = require('vm').createContext;
var fs = require('fs');
var process = require('process');


const COLD_START_DELAY = 250;


const old = console;

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

function revertLog() {
	console = old;
}


async function main(lambda_name, context) {

console.log(`\taltLambda()->START`);


let contextObj = {
    console,
    require,
    _context : context
};

const vmContext = createContext(contextObj);


var taskId = uuid();
overrideLog(lambda_name);
console.log(`START RequestId: ${taskId} Version: $LATEST`);
const start = Date.now();
const startMem = process.memoryUsage().rss;

//console.log(JSON.stringify(startMem, null, 2));

await new Promise(resolve => setTimeout(resolve, COLD_START_DELAY));

try {

const script = new Script(`
        var o = require('./${lambda_name}/index.js');
        o(_context);
`);
var out = script.runInContext(vmContext);

} catch (e) {
	console.log(e);
	out = { statusCode: 500, body: e.toString() };
}

const endMem = process.memoryUsage().rss;
const end = Date.now();
const duration = end-start;
console.log(`REPORT RequestId: ${taskId}	Duration: ${duration} ms	Billed Duration: ${duration} ms	Memory Size: 'unlimited' MB	Max Memory Used: ${((endMem-startMem)/(1024*1024)).toPrecision(2)} MB`);
revertLog();

console.log(`\taltLambda()->END`);

	return out;
}

module.exports = main;
