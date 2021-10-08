const express   	= require('express');
const fs		= require('fs');
const vm4		= require('./vm4.js');
const uuid		= require('uuid').v4;
const AWS		= require('aws-sdk');

const app 		= express();
const port 		= 8000;
const AWS_PROFILE	= 'default';

app.disable('x-powered-by');
app.options("/*", function(req, res, next) {
  console.log(`API-gw(OPTIONS)`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.send(200);
});

async function getTempCreds(profile) {

	var _AWS 		= require('aws-sdk');
	var credentials         = new _AWS.SharedIniFileCredentials({profile: profile});
	_AWS.config.credentials = credentials;
	var sts 		= new _AWS.STS({apiVersion: '2011-06-15'});

	var c 			= await sts.getSessionToken().promise();

	return {
		id : c.Credentials.AccessKeyId,
		secret : c.Credentials.SecretAccessKey,
		token : c.Credentials.SessionToken
	};
}


class APIgw {

	constructor(lambda, method, path) {
		this.method = method;
		this.path = path;
		this.lambda = lambda;
		this.self   = this;
	}

	async functionHandler(req, res) {

		var that = this.self;

        	console.log(`API-gw(${that.method})->${that.lambda}`);

		try {
			var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
			var qs = null;
			if (JSON.stringify(req.query) !== "{}") {
				qs = req.query;
			}

			var key = getTempCreds(AWS_PROFILE);			// TODO: should we cache this?  Can we cache this? 
			process.env = {};
			process.env.foo = "bar";
			process.env.AWS_ACCESS_KEY_ID = key.id;			// Kludge to give credentials to the script
			process.env.AWS_SECRET_ACCESS_KEY = key.secret;
			process.env.AWS_SESSION_TOKEN = key.token;


			var out = await vm4(that.lambda, {
				resource: that.path,
				path: that.path,
				httpMethod: that.method,
				headers: req.headers,
				//multiValueHeaders : {}			// TODO
				queryStringParameters : qs,
				//pathParameters : {}				// TODO
				stageVariables: null,				// TODO
				requestContext : {
					resourceId : 'bogus',			// TODO: we 'could' associate this with our defined one on the cfg file
					resourcePath: that.path,
					httpMethod : that.method,
					extendedRequestId: 'bogus',		// TODO: fill this in? 
					requestTime: (new Date().toString()),	// TODO: fix this formatting... 
					path : that.path,
					accountId: '11111111111',		// Whatever, it's our bogus one :D
					protocol: "HTTP/1.1",			// TODO: can we detect this from express? 
					stage: "v1",				// TODO: allow to be mocked
					domainPrefix: 'mydomain',		// TODO: allow to be mocked
					requestTimeEpoch: (new Date().getTime()), // TODO: does this need to be unixtime or js time? 
					requestId: uuid(),			// 
					identity: {
						cognitoIdentityPoolId: null,	// allow for mock
						cognitoIdentityId : null,
						apiKey : 'allow for mock',	// 
						principalOrgId : null,
						cognitoAuthenticationType: null,
						userArn : null,
						userAgent: null,
						accountId: null,
						caller: null,
						sourceIp: ip,
						accessKey : null,
						cognitoAuthenticationProvider : null,
						user : null
					},
					domainName : 'mydomain.localhost',	// TODO: allow for mock	
					apiId: 'bogus',				// mock
				},
				body : undefined,				// TODO: support this? 
				isBase64Encoded : false				// suppor tthis
			});

			//console.log(`sending`, JSON.stringify(out));
			res.status(out.statusCode);
			if (typeof out.headers !== 'undefined') {
				res.set(out.headers);
			}
			res.send(out.body);

		} catch (e) {
			var msg = {
				statusCode: 500,
				body: e.toString()
			}
			res.send(JSON.stringify(msg));
		}
	}
}

function loadCfg(fname, app) {

	console.log(`API-gw()->loading configuration...`);

	try {

		var cfg = fs.readFileSync(fname);
		cfg = JSON.parse(cfg.toString());	

	} catch (e) {
		console.log(e);
	}

	//
	// Configure express...

	try {

	    for (var i=0; i < cfg.length; i++) {
		console.log(`\tmethod: `, cfg[i].method);
		console.log(`\tpath:   `, cfg[i].path);
		console.log(`\tlambda: `, cfg[i].lambda);

		if (cfg[i].method === 'GET') {

			var api = new APIgw(cfg[i].lambda, cfg[i].method, cfg[i].path);
			app.get(cfg[i].path, (req, res) => { api.functionHandler(req,res); } );

		} else if (cfg[i].method === 'POST') {



		} else if (cfg[i].method === 'PUT') {


		} else if (cfg[i].method === 'PATCH') {


		} else if (cfg[i].method === 'DELETE') {



		} else {
			console.log(`unsupported method: ${cfg[i].method}`);
			process.exit();
		}

	    }

	} catch (e) {
		console.log(`error with configuration for: ${cfg[i].path}`);
		console.log(e);
	}
}

//
// Load the configuration file:
loadCfg('altlambda.json', app);

//
// Start up the server:
app.listen(port, () => {
  console.log(`altLambda->listening at http://localhost:${port}\n`)
});

