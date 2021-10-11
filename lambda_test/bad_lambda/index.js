//
// Test a long running lambda interruption:

async function handler(event) {

    console.log(`Hi there, i'm going to run too long.. interrupt me please`);

    console.log(`About to wait 6 seconds..but interrupt me in 5`);
    await new Promise(resolve=> setTimeout(() => {console.log(`this should take a while`); }, 6000));
    console.log(`Made it through the wait period, you shouldn't see this`);
    
    return JSON.stringify({statusCode: 200, body : "If you see this, we didn't interrupt"});
}

exports.handler = handler;
