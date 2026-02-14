var normalizeGiteaApiBaseUrl = require('./normalize-gitea-base-url').normalizeGiteaApiBaseUrl;
var redactSecrets = require('./redact-secrets').redactSecrets;
var GiteaApiError = require('./gitea-error').GiteaApiError;
var normalizeGiteaErrorMessage = require('./gitea-error').normalizeGiteaErrorMessage;

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {{ [key: string]: any }} [query]
 * @returns {string}
 */
function buildApiUrl(baseUrl, path, query) {
    var base = String(baseUrl || '').replace(/\/+$/, '');
    var p = String(path || '');
    if (p && p[0] !== '/') {
        p = '/' + p;
    }

    var url = base + p;
    if (!query) {
        return url;
    }

    var searchParams = new URLSearchParams();
    Object.keys(query).forEach(function (key) {
        var value = query[key];
        if (value === undefined || value === null || value === '') {
            return;
        }
        searchParams.set(key, String(value));
    });

    var qs = searchParams.toString();
    return qs ? (url + '?' + qs) : url;
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
function parseJsonSafely(text) {
    if (!text) {
        return { ok: true, value: null };
    }

    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (e) {
        return { ok: false, error: 'Invalid JSON response' };
    }
}

/**
 * Create a minimal fetch-based Gitea API client.
 *
 * @param {{
 *   baseUrl: string,
 *   token: string,
 *   fetch?: (url: string, init?: any) => Promise<any>
 * }} options
 */
function createGiteaClient(options) {
    options = options || {};

    var apiBaseUrl = normalizeGiteaApiBaseUrl(options.baseUrl);
    var token = String(options.token || '');
    var fetchImpl = options.fetch || (typeof fetch === 'function' ? fetch : null);

    if (typeof fetchImpl !== 'function') {
        throw new Error('fetch is required to create a Gitea client');
    }

    /**
     * @param {{ method: string, path: string, query?: any, body?: any }} req
     */
    async function requestJson(req) {
        var url = buildApiUrl(apiBaseUrl, req.path, req.query);

        var headers = {
            'Accept': 'application/json',
        };

        if (token) {
            headers['Authorization'] = 'token ' + token;
        }

        var init = {
            method: req.method,
            headers: headers,
        };

        if (req.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(req.body);
        }

        var response;
        try {
            response = await fetchImpl(url, init);
        } catch (e) {
            throw GiteaApiError('Could not reach Gitea. Check the base URL and your network connection.', {
                cause: e,
                token: token,
            });
        }

        var text;
        try {
            text = await response.text();
        } catch (e) {
            throw GiteaApiError('Gitea request failed while reading the response.', {
                status: response && response.status,
                cause: e,
                token: token,
            });
        }

        var parsed = parseJsonSafely(text);
        var data = parsed.ok ? parsed.value : null;

        if (response.ok) {
            return data;
        }

        var apiMessage = '';
        if (data && typeof data === 'object') {
            apiMessage = data.message || data.error || '';
        }

        apiMessage = redactSecrets(String(apiMessage || ''), [token]);

        throw GiteaApiError(normalizeGiteaErrorMessage({
            status: response.status,
            apiMessage: apiMessage,
            token: token,
        }), {
            status: response.status,
            token: token,
        });
    }

    return {
        apiBaseUrl: apiBaseUrl,

        listUserRepos: function (options) {
            options = options || {};
            return requestJson({
                method: 'GET',
                path: '/user/repos',
                query: {
                    page: options.page,
                    limit: options.limit,
                },
            });
        },

        listOrgRepos: function (options) {
            options = options || {};
            if (!options.org) {
                return Promise.reject(GiteaApiError('Organization name is required to list organization repos.'));
            }
            return requestJson({
                method: 'GET',
                path: '/orgs/' + encodeURIComponent(options.org) + '/repos',
                query: {
                    page: options.page,
                    limit: options.limit,
                },
            });
        },

        listRepoLabels: function (options) {
            options = options || {};
            if (!options.owner || !options.repo) {
                return Promise.reject(GiteaApiError('Owner and repo are required to list labels.'));
            }
            return requestJson({
                method: 'GET',
                path: '/repos/' + encodeURIComponent(options.owner) + '/' + encodeURIComponent(options.repo) + '/labels',
                query: {
                    page: options.page,
                    limit: options.limit,
                },
            });
        },

        createIssue: function (options) {
            options = options || {};
            if (!options.owner || !options.repo) {
                return Promise.reject(GiteaApiError('Owner and repo are required to create an issue.'));
            }
            if (!options.title) {
                return Promise.reject(GiteaApiError('Title is required to create an issue.'));
            }

            var labels = Array.isArray(options.labels) ? options.labels : undefined;
            return requestJson({
                method: 'POST',
                path: '/repos/' + encodeURIComponent(options.owner) + '/' + encodeURIComponent(options.repo) + '/issues',
                body: {
                    title: options.title,
                    body: options.body || '',
                    labels: labels,
                },
            });
        },
    };
}

module.exports = {
    buildApiUrl: buildApiUrl,
    createGiteaClient: createGiteaClient,
};
