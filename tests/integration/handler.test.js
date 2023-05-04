import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import sinon from 'sinon';
import { afterEach, describe, expect, it } from 'vitest';
import { handler } from '../../index.mjs';

describe('[testes de integração] verificando o comportamento do handler', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('deve retornar um array de items ao receber o evento GET /api/items', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.resolves({ Items: [{ id: '1', name: 'item-test', price: 100 }] });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'GET /api/items',
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body[0]).toHaveProperty('id', '1');
    expect(body[0]).toHaveProperty('name', 'item-test');
    expect(body[0]).toHaveProperty('price', 100);
  });

  it('deve retornar um item ao receber o evento GET /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.resolves({ Item: { id: '1', name: 'item-test', price: 100 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'GET /api/items/{id}',
      pathParameters: { id: '1' },
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(200);
    expect(body).toHaveProperty('id', '1');
    expect(body).toHaveProperty('name', 'item-test');
    expect(body).toHaveProperty('price', 100);
  });

  it('deve retornar um item ao receber o evento DELETE /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.resolves({});

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'DELETE /api/items/{id}',
      pathParameters: { id: '1' },
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(204);
    expect(body).toEqual({});
  });

  it('deve retornar um item ao receber o evento POST /api/items', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.resolves({ Item: { id: '1', name: 'item-test', price: 100 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'POST /api/items',
      body: JSON.stringify({ id: '1', name: 'item-test', price: 100 }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(201);
    expect(body).toHaveProperty('id', '1');
    expect(body).toHaveProperty('name', 'item-test');
    expect(body).toHaveProperty('price', 100);
  });

  it('deve retornar um item atualizado ao receber o evento PUT /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.onCall(0).resolves({ Item: { id: '1', name: 'item-test', price: 100 } });
    stub.onCall(1).resolves({ Attributes: { id: '1', name: 'item-test', price: 200 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'PUT /api/items/{id}',
      pathParameters: { id: '1' },
      body: JSON.stringify({ name: 'item-test', price: 200 }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(200);
    expect(body).toHaveProperty('id', '1');
    expect(body).toHaveProperty('name', 'item-test');
    expect(body).toHaveProperty('price', 200);
  });

  it('deve retornar um error caso o item não exista ao receber o evento PUT /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.onCall(0).resolves({});
    stub.onCall(1).resolves({ Attributes: { id: '1', name: 'item-test', price: 200 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'PUT /api/items/{id}',
      pathParameters: { id: '1' },
      body: JSON.stringify({ name: 'item-test', price: 200 }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(404);
    expect(body).toHaveProperty('error', 'item not found');
  });

  it('deve retornar um error caso algum campo obrigatório não seja informado no body ao receber o evento PUT /api/items/{id}', async () => {
    sinon.stub(DynamoDBDocumentClient.prototype, 'send');

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'PUT /api/items/{id}',
      pathParameters: { id: '1' },
      body: JSON.stringify({ name: 'item-test' }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(400);
    expect(body).toHaveProperty('error', '#price field is required');
  });

  it('deve retornar um item parcialmente atualizado ao receber o evento PATCH /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.onCall(0).resolves({ Item: { id: '1', name: 'item-test', price: 100 } });
    stub.onCall(1).resolves({ Attributes: { id: '1', name: 'item-test', price: 200 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'PATCH /api/items/{id}',
      pathParameters: { id: '1' },
      body: JSON.stringify({ price: 200 }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(200);
    expect(body).toHaveProperty('id', '1');
    expect(body).toHaveProperty('name', 'item-test');
    expect(body).toHaveProperty('price', 200);
  });

  it('deve retornar um error caso o item não exista ao receber o evento PATCH /api/items/{id}', async () => {
    const stub = sinon.stub(DynamoDBDocumentClient.prototype, 'send');
    stub.onCall(0).resolves({});
    stub.onCall(1).resolves({ Attributes: { id: '1', name: 'item-test', price: 200 } });

    const { body: rawBody, statusCode } = await handler({
      routeKey: 'PATCH /api/items/{id}',
      pathParameters: { id: '1' },
      body: JSON.stringify({ price: 200 }),
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(404);
    expect(body).toHaveProperty('error', 'item not found');
  });

  it('deve retornar um error caso receba um evento "$default" (que não corresponda aos recursos expostos pela API)', async () => {
    const { body: rawBody, statusCode } = await handler({
      routeKey: '$default',
      pathParameters: { id: '1' },
      body: JSON.stringify({ name: 'John Doe' }),
      requestContext: { http: { method: 'GET', path: '/users' } },
    });

    const body = JSON.parse(rawBody);
    expect(statusCode).toBe(404);
    expect(body).toHaveProperty('error', "route 'GET /users' not found");
  });
});
