import { expect, test } from 'vitest';

import { buildApiUrl, createGiteaClient, normalizeGiteaApiBaseUrl, normalizeGiteaErrorMessage } from '../popup/lib/gitea/index.js';
import { buildCreateIssueParams } from '../popup/lib/destinations/gitea/gitea-issue-core.js';

test('normalizeGiteaApiBaseUrl strips trailing slashes and ensures /api/v1', () => {
    expect(normalizeGiteaApiBaseUrl('https://gitea.example.com')).toBe('https://gitea.example.com/api/v1');
    expect(normalizeGiteaApiBaseUrl('https://gitea.example.com/')).toBe('https://gitea.example.com/api/v1');
    expect(normalizeGiteaApiBaseUrl('https://gitea.example.com/api/v1')).toBe('https://gitea.example.com/api/v1');
    expect(normalizeGiteaApiBaseUrl('https://gitea.example.com/api/v1/')).toBe('https://gitea.example.com/api/v1');
});

test('normalizeGiteaApiBaseUrl trims api suffix and query/hash noise', () => {
    expect(normalizeGiteaApiBaseUrl('https://gitea.example.com/prefix/api/v1/repos?page=2#frag'))
        .toBe('https://gitea.example.com/prefix/api/v1');
});

test('buildApiUrl adds leading slash and omits empty query params', () => {
    const url = buildApiUrl('https://gitea.example.com/api/v1/', 'user/repos', {
        page: 1,
        limit: null,
        filter: '',
        q: 'text',
    });

    expect(url).toBe('https://gitea.example.com/api/v1/user/repos?page=1&q=text');
});

test('createGiteaClient uses Authorization token header and builds correct URLs', async () => {
    /** @type {Array<{ url: string, init: RequestInit }>} */
    const calls = [];

    const fetch = async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return {
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ([{ full_name: 'me/repo', name: 'repo', owner: { login: 'me' } }]),
            text: async () => '[]',
        };
    };

    const token = 'SECRET_TOKEN_SHOULD_NOT_LEAK';
    const client = createGiteaClient({ baseUrl: 'https://gitea.example.com/', token, fetch });

    await client.listUserRepos();

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://gitea.example.com/api/v1/user/repos');
    expect(calls[0].init.headers.Authorization).toBe(`token ${token}`);
});

test('createIssue sends numeric label ids from mapped params', async () => {
    let capturedBody = null;

    const fetch = async (_url, init) => {
        capturedBody = JSON.parse(String(init.body || '{}'));
        return {
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ number: 42 }),
        };
    };

    const params = buildCreateIssueParams({
        repoFullName: 'me/repo',
        title: 'Hello',
        labelIds: ['10', 'bad', 11],
    });

    const client = createGiteaClient({ baseUrl: 'https://gitea.example.com', token: 'x', fetch });
    await client.createIssue(params);

    expect(capturedBody.labels).toEqual([10, 11]);
    expect(capturedBody.title).toBe('Hello');
});

test('createGiteaClient normalizes errors and does not leak tokens in messages', async () => {
    const token = 'VERY_SECRET_TOKEN_123';

    const fetch = async () => {
        return {
            ok: false,
            status: 401,
            headers: { get: () => 'application/json' },
            json: async () => ({ message: `bad token ${token}` }),
            text: async () => JSON.stringify({ message: `bad token ${token}` }),
        };
    };

    const client = createGiteaClient({ baseUrl: 'https://gitea.example.com', token, fetch });

    await expect(client.listUserRepos()).rejects.toMatchObject({ status: 401 });
    try {
        await client.listUserRepos();
    } catch (err) {
        expect(String(err.message || '')).not.toContain(token);
    }
});

test('normalizeGiteaErrorMessage returns validation message and redacts tokens', () => {
    const message = normalizeGiteaErrorMessage({
        status: 422,
        apiMessage: 'invalid label id SECRET',
        token: 'SECRET',
    });

    expect(message).toContain('Gitea rejected the issue data');
    expect(message).not.toContain('SECRET');
});
