/**
 * Pure helpers for building the Gitea repo dropdown.
 * Keep this file side-effect free so it can be unit tested.
 */

/**
 * @param {any} repo
 * @returns {string}
 */
function getRepoOwnerLogin(repo) {
    return String(
        (repo && repo.owner && (repo.owner.login || repo.owner.username || repo.owner.name)) ||
        ''
    ).trim();
}

/**
 * @param {any} repo
 * @returns {string}
 */
function getRepoName(repo) {
    return String((repo && (repo.name || repo.repo_name)) || '').trim();
}

/**
 * @param {any} repo
 * @returns {string}
 */
function getRepoFullName(repo) {
    var full = String((repo && (repo.full_name || repo.fullName)) || '').trim();
    if (full) {
        return full;
    }

    var owner = getRepoOwnerLogin(repo);
    var name = getRepoName(repo);
    if (owner && name) {
        return owner + '/' + name;
    }

    return '';
}

/**
 * @param {any} repo
 * @returns {string}
 */
function getRepoDedupeKey(repo) {
    var fullName = getRepoFullName(repo);
    if (fullName) {
        return 'full:' + fullName;
    }

    if (repo && (typeof repo.id === 'number' || typeof repo.id === 'string') && String(repo.id).trim()) {
        return 'id:' + String(repo.id).trim();
    }

    return '';
}

/**
 * Merge, dedupe, sort and group repos.
 *
 * Requirements:
 * - Dedupe by repo full_name (we also prefer repo id when present)
 * - Group by owner (optgroup label)
 * - Sort deterministically (groups then repos)
 *
 * @param {{ userRepos?: any[], orgRepos?: any[] }} input
 * @returns {{ owner: string, repos: any[] }[]}
 */
function mergeDedupeSortGroupRepos(input) {
    input = input || {};

    var all = []
        .concat(Array.isArray(input.userRepos) ? input.userRepos : [])
        .concat(Array.isArray(input.orgRepos) ? input.orgRepos : []);

    var deduped = [];
    var seen = {};

    all.forEach(function (repo) {
        var key = getRepoDedupeKey(repo);
        if (!key) {
            return;
        }
        if (seen[key]) {
            return;
        }
        seen[key] = true;
        deduped.push(repo);
    });

    var groupsByOwner = {};
    deduped.forEach(function (repo) {
        var owner = getRepoOwnerLogin(repo) || '(unknown owner)';
        groupsByOwner[owner] = groupsByOwner[owner] || [];
        groupsByOwner[owner].push(repo);
    });

    var ownerKeys = Object.keys(groupsByOwner);
    ownerKeys.sort(function (a, b) {
        return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
    });

    return ownerKeys.map(function (owner) {
        var repos = (groupsByOwner[owner] || []).slice();
        repos.sort(function (a, b) {
            var an = getRepoName(a).toLowerCase();
            var bn = getRepoName(b).toLowerCase();
            if (an !== bn) {
                return an.localeCompare(bn);
            }
            return getRepoFullName(a).toLowerCase().localeCompare(getRepoFullName(b).toLowerCase());
        });

        return { owner: owner, repos: repos };
    });
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * @param {{ owner: string, repos: any[] }[]} groups
 * @returns {string}
 */
function buildRepoSelectHtml(groups) {
    var safeGroups = Array.isArray(groups) ? groups : [];
    if (!safeGroups.length) {
        return '<option>No repos found</option>';
    }

    return safeGroups.map(function (group) {
        var owner = String(group && group.owner ? group.owner : '').trim();
        var repos = Array.isArray(group && group.repos) ? group.repos : [];

        var optionsHtml = repos.map(function (repo) {
            var fullName = getRepoFullName(repo);
            var name = getRepoName(repo) || fullName;
            return '<option value="' + escapeHtml(fullName) + '">' + escapeHtml(name) + '</option>';
        }).join('');

        return '<optgroup label="' + escapeHtml(owner) + '">' + optionsHtml + '</optgroup>';
    }).join('');
}

module.exports = {
    buildRepoSelectHtml: buildRepoSelectHtml,
    getRepoFullName: getRepoFullName,
    mergeDedupeSortGroupRepos: mergeDedupeSortGroupRepos,
};
