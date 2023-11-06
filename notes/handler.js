'use strict';

const AWS = require('aws-sdk'); 
const DynamoDB = require("aws-sdk/clients/dynamodb");
const documentClient = new AWS.DynamoDB.DocumentClient({region: "us-east-2", maxRetries: 3, httpOptions: {timeout: 5000}

});
const NOTES_TABLE_NAME = process.env.NOTES_TABLE_NAME;

module.exports.createNote = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log("Received event:", JSON.stringify(event, null, 2));

  // let data = JSON.parse(event.body);
  let data;
  try {
    data = JSON.parse(event.body);
    console.log("Parsed data:", data);
  } catch (parseError) {
    console.error("Error parsing event body:", parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON in request body" }),
    };
  }
  const params = {
    TableName: NOTES_TABLE_NAME,
    Item: {
      notesId: data.id,
      title: data.title,
      body: data.body,
    },
    ConditionExpression: "attribute_not_exists(notesId)",
  };

  // Log the parameters for the DynamoDB operation
  console.log("DynamoDB Put Params:", JSON.stringify(params, null, 2));

  try {
    // Attempt to write to DynamoDB
    const result = await documentClient.put(params).promise();
    console.log("DynamoDB Put Success:", result);

    // If successful, return the created item
    return {
      statusCode: 201,
      body: JSON.stringify(params.Item),
    };
  } catch (error) {
    // Log the error if the DynamoDB operation failed
    console.error("DynamoDB Put Error:", error);

    // Return a 500 error response
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ message: "Could not create note", error: error.message }),
    };
  }
};

module.exports.updateNote = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let notesId = event.pathParameters.id;
  let data = JSON.parse(event.body);
  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
      Key: {notesId},
      UpdateExpression: "set #title = :title, #body = :body",
      ExpressionAttributeNames: {
        "#title": "title",
        "#body": "body",
      },
        ExpressionAttributeValues: {
          ":title": data.title,
          ":body": data.body
        },
        ConditionExpression: "attribute_exists(notesId)"
      }
      await documentClient.update(params).promise();
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(data)
      });
  } catch (error) {
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(error.message),
  })
  }
};

module.exports.deleteNote = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let notesId = event.pathParameters.id;
  try {
    const params = {
      TableName: NOTES_TABLE_NAME,
      Key: {notesId},
      ConditionExpression: "attribute_exists(notesId)"
    }
    await documentClient.delete(params).promise();
    callback(null, {
      statusCode: 200,
      body: JSON.stringify("the note with id: " + notesId + " got deleted"),
    });
  } catch (error) {
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(error.message),
  })
  }
  return {
    statusCode: 200,
    body: JSON.stringify("the note with id: " + notesId + " got deleted"),
  };
};

module.exports.getAllNotes = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const params = {
      TableName: NOTES_TABLE_NAME
    }
    const notes = await documentClient.scan(params).promise();
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(notes.Items),
    });
  } catch(error) {
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(error.message),
  })
  }
};
