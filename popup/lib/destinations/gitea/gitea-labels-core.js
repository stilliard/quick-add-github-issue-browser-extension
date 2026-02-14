/**
 * Pure helpers for label picker.
 */

/**
 * @param {any} label
 * @returns {{ id: number|string, name: string, color: string }}
 */
function normalizeLabel(label) {
    return {
        id: label && label.id,
        name: String((label && label.name) || '').trim(),
        color: String((label && label.color) || '').trim(),
    };
}

/**
 * @param {any[]} labels
 * @param {string} query
 * @returns {any[]}
 */
function filterLabels(labels, query) {
    var list = Array.isArray(labels) ? labels : [];
    var q = String(query || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter(function (l) {
        var name = String((l && l.name) || '').toLowerCase();
        return name.indexOf(q) !== -1;
    });
}

/**
 * @param {any} color
 * @returns {string}
 */
function normalizeHexColor(color) {
    var c = String(color || '').trim();
    if (!c) return '';
    if (c[0] === '#') return c;
    // Gitea typically returns hex without '#'
    if (/^[0-9a-fA-F]{3}$/.test(c) || /^[0-9a-fA-F]{6}$/.test(c)) {
        return '#' + c;
    }
    return '';
}

module.exports = {
    filterLabels,
    normalizeHexColor,
    normalizeLabel,
};
