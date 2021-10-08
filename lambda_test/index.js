//
// Test lambda function:
var AWS = require('aws-sdk');
var db = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

async function handler(event) {

    //
    // Log the incoming event:
    console.log(JSON.stringify(event, null, 2));
    
    //
    // Dump the environmental variables:
    console.log(`ENV: `, JSON.stringify(process.env, null, 2));

    // 
    // Fetch from a db
    var dbres = undefined;
    // dbres = await db.get({ 
    //     TableName: 'sometable',
    //     Key : { pk : 'foo' }
    // }).promise();
    
	const res = {
        statusCode : 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body : JSON.stringify({ msg: "Hello world!", res: dbres })
    };

    // Log our output payload
    console.log(`res: `, JSON.stringify(res, null, 2));
    
    // return it!
	return res;
}

module.exports=handler;