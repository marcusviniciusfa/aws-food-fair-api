import axios from 'axios';
import * as dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

dotenv.config();

describe('[testes end-to-end] verificando o comportamento da api', () => {
  const headers = { 'Content-Type': 'application/json' };
  const baseUrl = process.env.API_GATEWAY_BASE_URL;

  it('deve fazer uma requisição GET /api/items e receber um array de items', async () => {
    const id = randomUUID();
    const { status: statusPost } = await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'post',
      data: { id, name: 'item-test-1', price: 100 },
    });

    const { data, status: statusGet } = await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'get',
    });

    await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'delete',
    });

    expect(statusPost).toBe(201);
    expect(statusGet).toBe(200);
    expect(data).toBeInstanceOf(Array);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('price');
  });

  it('deve fazer uma requisição GET /api/items/{id} e receber um item', async () => {
    const id = randomUUID();
    const { status: statusPost } = await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'post',
      data: { id, name: 'item-test-1', price: 100 },
    });

    const { data, status: statusGet } = await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'get',
    });

    await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'delete',
    });

    expect(statusPost).toBe(201);
    expect(statusGet).toBe(200);
    expect(data).toHaveProperty('id', id);
    expect(data).toHaveProperty('name', 'item-test-1');
    expect(data).toHaveProperty('price', 100);
  });

  it('deve fazer uma requisição DELETE /api/items/{id} e deletar um item', async () => {
    const id = randomUUID();
    await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'post',
      data: { id, name: 'item-test-1', price: 100 },
    });

    const { status } = await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'delete',
    });

    expect(status).toBe(204);
  });

  it('deve fazer uma requisição PUT /api/items e atualizar totalmente um item', async () => {
    const id = randomUUID();
    await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'post',
      data: { id, name: 'item-test-1', price: 100 },
    });

    const { data, status } = await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'put',
      data: { id, name: 'item-test-1', price: 200 },
    });

    await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'delete',
    });

    expect(status).toBe(200);
    expect(data).toHaveProperty('id', id);
    expect(data).toHaveProperty('name', 'item-test-1');
    expect(data).toHaveProperty('price', 200);
  });

  it('deve retornar um error caso o item não exista para uma requisição PUT /api/items', async () => {
    expect.hasAssertions();
    const id = randomUUID();
    try {
      await axios({
        headers,
        url: `${baseUrl}/api/items/${id}`,
        method: 'put',
        data: { name: 'item-test-1', price: 200 },
      });
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('error', 'item not found');
    }
  });

  it.each([
    { id: randomUUID(), body: { name: 'item-test-1', price: undefined }, expectedError: '#price field is required' },
    { id: randomUUID(), body: { name: undefined, price: 100 }, expectedError: '#name field is required' },
  ])('deve retornar um error caso algum campo obrigatório não seja informado numa requisição PUT /api/items', async ({ id, body, expectedError }) => {
    expect.hasAssertions();
    try {
      await axios({
        headers,
        url: `${baseUrl}/api/items/${id}`,
        method: 'put',
        data: body,
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error', expectedError);
    }
  });

  it('deve fazer uma requisição PATCH /api/items e retornar um item parcialmente atualizado', async () => {
    const id = randomUUID();
    await axios({
      headers,
      url: `${baseUrl}/api/items`,
      method: 'post',
      data: { id, name: 'item-test-1', price: 100 },
    });

    const { data, status } = await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'patch',
      data: { price: 300 },
    });

    await axios({
      headers,
      url: `${baseUrl}/api/items/${id}`,
      method: 'delete',
    });

    expect(status).toBe(200);
    expect(data).toHaveProperty('id', id);
    expect(data).toHaveProperty('name', 'item-test-1');
    expect(data).toHaveProperty('price', 300);
  });

  it('deve retornar um error caso o item não exista para uma requisição PATCH /api/items', async () => {
    expect.hasAssertions();
    const id = randomUUID();
    try {
      await axios({
        headers,
        url: `${baseUrl}/api/items/${id}`,
        method: 'put',
        data: { id, name: 'item-test-1', price: 200 },
      });
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('error', 'item not found');
    }
  });

  it('deve retornar um error caso seja feita uma requisição para um recurso que não foi exposto pela API', async () => {
    expect.hasAssertions();
    try {
      await axios({
        headers,
        url: `${baseUrl}/users`,
        method: 'get',
      });
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('error', "route 'GET /users' not found");
    }
  });
});
