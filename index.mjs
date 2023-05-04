import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = 'crud-food-fair-table';

const OK_CODE = 200;
const CREATED_CODE = 201;
const NO_CONTENT_CODE = 204;
const BAD_REQUEST_CODE = 400;
const NOT_FOUND_CODE = 404;

export const handler = async (event) => {
  try {
    if (event.routeKey === 'DELETE /api/items/{id}') {
      return await deleteItem(event, TABLE_NAME);
    }
    if (event.routeKey === 'GET /api/items/{id}') {
      return await findItem(event, TABLE_NAME);
    }
    if (event.routeKey === 'GET /api/items') {
      return await findItems(TABLE_NAME);
    }
    if (event.routeKey === 'POST /api/items') {
      return await createItem(event, TABLE_NAME);
    }
    if (event.routeKey === 'PUT /api/items/{id}') {
      return await updateItem(event, TABLE_NAME);
    }
    if (event.routeKey === 'PATCH /api/items/{id}') {
      return await updateItemPart(event, TABLE_NAME);
    }
    if (event.routeKey === '$default') {
      return await notFoundResponse(event, TABLE_NAME);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(error);
    }
    return makeResponse({ error: error.message }, BAD_REQUEST_CODE);
  }
};

function makeResponse(body, statusCode) {
  return {
    headers: { 'Content-Type': 'application/json' },
    statusCode,
    body: JSON.stringify(body),
  };
}

async function deleteItem(event, TABLE_NAME) {
  const { id } = event.pathParameters;
  await dynamoDbDocClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
  return makeResponse({}, NO_CONTENT_CODE);
}

async function findItem(event, TABLE_NAME) {
  const { id } = event.pathParameters;
  const { Item } = await dynamoDbDocClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
  if (!Item) {
    return makeResponse({ error: 'item not found' }, NOT_FOUND_CODE);
  }
  return makeResponse(Item, OK_CODE);
}

async function findItems(TABLE_NAME) {
  const { Items } = await dynamoDbDocClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  const body = Items || [];
  return makeResponse(body, OK_CODE);
}

async function createItem(event, TABLE_NAME) {
  const request = JSON.parse(event.body);
  checkFields(request, 'name', 'price');
  request.id = request.id || randomUUID();
  const item = {
    id: request.id,
    price: request.price,
    name: request.name,
  };
  await dynamoDbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
  return makeResponse(item, CREATED_CODE);
}

async function updateItem(event, TABLE_NAME) {
  const request = JSON.parse(event.body);
  checkFields(request, 'name', 'price');
  const { id } = event.pathParameters;
  const { Item } = await dynamoDbDocClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
  if (!Item) {
    return makeResponse({ error: 'item not found' }, NOT_FOUND_CODE);
  }
  const { Attributes } = await dynamoDbDocClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      ExpressionAttributeNames: { '#n': 'name', '#p': 'price' },
      UpdateExpression: 'set #n = :n, #p = :p',
      ExpressionAttributeValues: {
        ':n': request.name || null,
        ':p': request.price || null,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return makeResponse(Attributes, OK_CODE);
}

async function updateItemPart(event, TABLE_NAME) {
  const request = JSON.parse(event.body);
  const { id } = event.pathParameters;
  const { Item } = await dynamoDbDocClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
  if (!Item) {
    return makeResponse({ error: 'item not found' }, NOT_FOUND_CODE);
  }
  const { Attributes } = await dynamoDbDocClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      ExpressionAttributeNames: { '#n': 'name', '#p': 'price' },
      UpdateExpression: 'set #n = :n, #p = :p',
      ExpressionAttributeValues: {
        ':n': request.name || Item.name,
        ':p': request.price || Item.price,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return makeResponse(Attributes, OK_CODE);
}

async function notFoundResponse(event) {
  const { method, path } = event.requestContext.http;
  return makeResponse({ error: `route '${method} ${path}' not found` }, NOT_FOUND_CODE);
}

function checkFields(body, ...requiredFields) {
  const missingFields = [];
  for (const field of requiredFields) {
    if (!body[field]) {
      missingFields.push(field);
    }
  }
  if (missingFields.length === 1) {
    throw new Error(`#${missingFields[0]} field is required`);
  }
  if (missingFields.length > 1) {
    throw new Error(`${missingFields.map((field) => `#${field}`).join(' and ')} fields are required`);
  }
}
