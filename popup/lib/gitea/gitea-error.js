var redactSecrets = require('./redact-secrets').redactSecrets;

/**
 * A user-facing error for Gitea API failures.
 *
 * @param {string} message
 * @param {{ status?: number, cause?: any, token?: string }} [options]
 */
function GiteaApiError(message, options) {
    options = options || {};

    var safeMessage = redactSecrets(String(message || 'Unexpected error'), [options.token]);
    var err = new Error(safeMessage);

    err.name = 'GiteaApiError';
    if (typeof options.status === 'number') {
        err.status = options.status;
    }
    if (options.cause) {
        err.cause = options.cause;
    }

    return err;
}

/**
 * @param {{ status?: number, apiMessage?: string, token?: string }} input
 * @returns {string}
 */
function normalizeGiteaErrorMessage(input) {
    input = input || {};
    var status = input.status;
    var apiMessage = redactSecrets(input.apiMessage || '', [input.token]);

    if (status === 401) {
        return 'Gitea authentication failed. Check your token.';
    }
    if (status === 403) {
        return 'Gitea refused this request. Check token permissions.';
    }
    if (status === 404) {
        return 'Gitea resource not found. Check the repo/org and base URL.';
    }
    if (status === 412) {
        return 'Gitea rejected this request due to preconditions. Please try again.';
    }
    if (status === 422) {
        return apiMessage ? ('Gitea rejected the issue data: ' + apiMessage) : 'Gitea rejected the issue data.';
    }
    if (status === 423) {
        return 'This repository is archived and cannot accept new issues.';
    }
    if (typeof status === 'number' && status >= 500) {
        return 'Gitea server error. Please try again later.';
    }

    return apiMessage ? ('Gitea request failed: ' + apiMessage) : 'Gitea request failed. Please try again.';
}

module.exports = {
    GiteaApiError: GiteaApiError,
    normalizeGiteaErrorMessage: normalizeGiteaErrorMessage,
};
