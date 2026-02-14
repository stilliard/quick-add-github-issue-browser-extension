/**
 * Redact secrets from any user-facing string.
 *
 * @param {string} text
 * @param {string[]} secrets
 * @returns {string}
 */
function redactSecrets(text, secrets) {
    if (typeof text !== 'string') {
        return '';
    }

    var result = text;
    (secrets || []).forEach(function (secret) {
        if (!secret || typeof secret !== 'string') {
            return;
        }
        // Replace all occurrences.
        result = result.split(secret).join('[redacted]');
    });

    return result;
}

module.exports = {
    redactSecrets: redactSecrets,
};
