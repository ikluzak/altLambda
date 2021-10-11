//
// File:    index.js
// Author:  Ivan Kluzak
// Date:    10/08/2021
// Notes:   altLambda - something to do a little local testing of an API-gw-like environment
//          mapped to lambda files and execute it locally.
//  
//          Also attempt to create a logs folder somewhat similar to what you might expect
//
//          Also attempt to provide credentials to the environment of the function executed
//          set via a temporary token fetched using the specified profile name.
//
//          Only planning to support Lambda proxy mode at the moment
//
const express       = require('express');
const fs            = require('fs');
const vm4           = require('./vm4.js');
const uuid          = require('uuid').v4;
const AWS           = require('aws-sdk');
const path          = require('path');

const app           = express();
//
// ----------------------------------------------------------------------------------------------
// CONFIGURATION:

const port          = 8000;         // <------ SET THIS TO YOUR PREFERRED
const AWS_PROFILE   = 'default';    // <------ SET THIS TO YOUR PREFERRED





// ----------------------------------------------------------------------------------------------

//
// Default empty cfg:
const CFG_BOILERPLATE=`{"port":8000,"base_path":"lambda_test","lambdas":[{"method":"GET","apipath":"/test","lambda":"test_lambda"},{"method":"GET","apipath":"/boilerplate","lambda":"aws_boilerplate"}]}`;

// Disable this information...
app.disable('x-powered-by');

// By default we'll just handle OPTIONS for anything...
app.options("/*", function(req, res, next) {
    console.log(`API-gw(OPTIONS)`);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.send(200);
});

// getTempCreds()
//  - pass the profile you want to use
//  - fetch temporary creds so we aren't using that profile directly...
//  - return those temporary creds, so later we can pass into the environment of the node vm context
async function getTempCreds(profile) {

    const _AWS              = require('aws-sdk');
    _AWS.config.credentials = new _AWS.SharedIniFileCredentials({profile: profile});
    var sts                 = new _AWS.STS({apiVersion: '2011-06-15'});

    var c                   = await sts.getSessionToken().promise();

	return {
		id : c.Credentials.AccessKeyId,
		secret : c.Credentials.SecretAccessKey,
		token : c.Credentials.SessionToken
	};
}

//
// Class to store our lambda specific configuration
//
//  lambda      = name of the lambda function ( generally the subdir of the lambda as well )
//  method      = GET,POST,PUT,DELETE,PATCH
//  apipath     = /your_route
//  filepath    = ./full/lambda/dir/index.js
//
class APIgw {

    constructor(lambda, method, apipath, filepath) {
        this.method     = method;
        this.path       = apipath;
        this.lambda     = lambda;
        this.fullpath   = filepath;
        this.self       = this;
    }

    // Do the function execution step...
    async functionHandler(req, res) {

        var that = this.self;
        console.log(`API-gw(${that.method})->${that.lambda}`);

        try {

            // Get the client IP to pass in later
            var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            var qs = null;                                  // default to null
            if (JSON.stringify(req.query) !== "{}") {       // Otherwise, set to the query params
                qs = req.query;
            }

            var key = getTempCreds(AWS_PROFILE);			// TODO: should we cache this?  Can we cache this? 
            process.env = {};
            // process.env.foo = "bar";                     // TODO: provide a mechanism to define ENV parameters to the lambda
            process.env.AWS_ACCESS_KEY_ID = key.id;			// Kludge to give credentials to the lambda environment
            process.env.AWS_SECRET_ACCESS_KEY = key.secret;
            process.env.AWS_SESSION_TOKEN = key.token;

            //
            // Call the node VM
            var out = await vm4(that.lambda, {
                resource: that.path,
                path: that.path,
                httpMethod: that.method,
                headers: req.headers,
                //multiValueHeaders : {}                    // TODO: handle these
                queryStringParameters : qs,
                //pathParameters : {}                       // TODO: handle these
                stageVariables: null,                       // TODO: mock or support cfg for this
                requestContext : {
                    resourceId : 'bogus',                   // TODO: we 'could' associate this with our defined one on the cfg file
                    resourcePath: that.path,
                    httpMethod : that.method,
                    extendedRequestId: 'bogus',             // TODO: mock or support cfg 
                    requestTime: (new Date().toString()),	// TODO: fix this formatting... 
                    path : that.path,
                    accountId: '11111111111',               // TODO: allow cfg
                    protocol: "HTTP/1.1",                   // TODO: can we detect this from express? 
                    stage: "v1",                            // TODO: allow to be mocked
                    domainPrefix: 'mydomain',               // TODO: allow to be mocked
                    requestTimeEpoch: (new Date().getTime()),// TODO: does this need to be unixtime or js time? 
                    requestId: uuid(),                      // does this need to match something else?  or is this fine
                    identity: {
                        cognitoIdentityPoolId: null,        // allow for mock
                        cognitoIdentityId : null,
                        apiKey : 'allow for mock',          // TODO: mock
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
                    domainName : 'mydomain.localhost',      // TODO: allow for mock	
                    apiId: 'bogus',                         // TODO: mock
                },
                body : undefined,                           // TODO: support this? 
                isBase64Encoded : false                     // TODO: support this
            },
            that.fullpath);                                 // include the full path location

            //
            // Start sending back our results... 
            res.status(out.statusCode);                     // What was the status code?
            if (typeof out.headers !== 'undefined') {       // Any headers?
                res.set(out.headers);
            }
            res.send(out.body);                             // Message body

        } catch (e) {
            // If we had some kind of crash, let's try to respond meaningfully...
            var msg = {
                statusCode: 500,
                body: e.toString()
            }
            res.send(JSON.stringify(msg));
        }
    }
}

//
// Load the altLambda configuration file:
function loadCfg(fname, app) {

    console.log(`API-gw()->loading configuration...`);

    var cfg = undefined;
    var _cfg = undefined;

    try {
        _cfg = fs.readFileSync(fname);
        _cfg = JSON.parse(_cfg.toString());
        if (typeof _cfg.lambdas === 'undefined') {
            console.log(`altLambda->ERROR: no lambdas section in cfg file`);
            process.exit();
        }
        cfg = _cfg.lambdas;

    } catch (e) {

        if (e.code === 'ENOENT') {
            console.log(`No cfg file found... writing base cfg`);
            fs.writeFileSync(fname, JSON.stringify(JSON.parse(CFG_BOILERPLATE), null, 2));
            console.log(`Sample config written to ${fname}`);
            process.exit();
        }

        console.log(`altLambda->ERROR: in configuration file`);
        console.log(e);
    }

    //
    // Configure express...
    try {

        for (var i=0; i < cfg.length; i++) {
            console.log(`\t--------------------------------------------`);
            console.log(`\tmethod: `, cfg[i].method);
            console.log(`\tpath:   `, cfg[i].apipath);
            console.log(`\tlambda: `, cfg[i].lambda);

            if (cfg[i].method === 'GET') {
                // Create a new APIgw object and map to route in express:
                let use_path = path.join(_cfg.base_path, cfg[i].lambda);
                console.log(`\tfull path: ${use_path}`);                    
                // The 'let' is crucial here:
                let api = new APIgw(cfg[i].lambda, cfg[i].method, cfg[i].apipath, use_path);
                app.get(cfg[i].apipath, (req, res) => { console.log(`${api.method} ${api.path} ${api.fullpath} ORG_PATH: ${req.originalUrl}`); api.functionHandler(req,res); } );

            } else if (cfg[i].method === 'POST') {
                console.log(`TODO: method '${cfg[i].method}' not supported by altLambda yet`);
            } else if (cfg[i].method === 'PUT') {
                console.log(`TODO: method '${cfg[i].method}' not supported by altLambda yet`);
            } else if (cfg[i].method === 'PATCH') {
                console.log(`TODO: method '${cfg[i].method}' not supported by altLambda yet`);
            } else if (cfg[i].method === 'DELETE') {
                console.log(`TODO: method '${cfg[i].method}' not supported by altLambda yet`);
            } else {
                console.log(`unsupported method: ${cfg[i].method}`);
                process.exit();
            }
        } // end for()

        console.log(`\t--------------------------------------------`);
        
    } catch (e) {
        console.log(`altLambda->ERROR: with configuration for: ${cfg[i].path}`);
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
