exports.handler = function (event, context, callback) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET,DELETE',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ result: 'hello' }),
  };
  callback(null, response);
};
