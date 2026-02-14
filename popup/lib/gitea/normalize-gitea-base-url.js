/**
 * Normalize a user-provided Gitea base URL to an API base URL.
 *
 * Accepts:
 * - https://gitea.example.com
 * - https://gitea.example.com/
 * - https://gitea.example.com/api/v1
 * - https://gitea.example.com/api/v1/
 * - https://gitea.example.com/some/prefix/api/v1/repos
 *
 * Returns:
 * - https://gitea.example.com/api/v1
 * - https://gitea.example.com/some/prefix/api/v1
 *
 * @param {string} input
 * @returns {string}
 */
function normalizeGiteaApiBaseUrl(input) {
    if (typeof input !== 'string') {
        throw new Error('Gitea base URL must be a string');
    }

    var raw = input.trim();
    if (!raw) {
        throw new Error('Gitea base URL is required');
    }

    if (!/^https?:\/\//i.test(raw)) {
        throw new Error('Gitea base URL must start with http:// or https://');
    }

    var url;
    try {
        url = new URL(raw);
    } catch (e) {
        throw new Error('Gitea base URL is not a valid URL');
    }

    // Remove query/hash noise (e.g. copy/paste from docs).
    url.search = '';
    url.hash = '';

    var path = (url.pathname || '/').replace(/\/+$/, '');

    // If the user pasted anything under /api/v1/*, trim back to the base.
    // Keep any non-root path prefix (common behind reverse proxies).
    var apiMatch = path.match(/^(.*)\/api\/v1(?:\/.*)?$/i);
    if (apiMatch) {
        path = apiMatch[1] || '';
    }

    path = (path || '').replace(/\/+$/, '');
    url.pathname = (path ? path : '') + '/api/v1';

    // URL.toString() always includes the pathname we set above.
    return url.toString().replace(/\/+$/, '');
}

module.exports = {
    normalizeGiteaApiBaseUrl: normalizeGiteaApiBaseUrl,
};
