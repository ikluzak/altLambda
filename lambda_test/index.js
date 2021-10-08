
var AWS = require('aws-sdk');
var db = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

async function handler(event) {

	console.log(JSON.stringify(event, null, 2));

	console.log(`ENV: `, JSON.stringify(process.env, null, 2));

	console.log(`HELLO: from lambda_test.handler()`);


	var dbres = await db.get({ 
		TableName: 'sometable',
		Key : { pk : 'foo' }
	}).promise();

	const res = {
                statusCode : 200,
		headers: {
                	'Access-Control-Allow-Origin': '*'
                },
                body : JSON.stringify({ msg: "Hello world!", res: dbres })
        };

	console.log(`res: `, JSON.stringify(res, null, 2));

	return res;
}

module.exports=handler;
