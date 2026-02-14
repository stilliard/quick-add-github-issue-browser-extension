var buildGitHubIssueTypeTemplate = require('../github/github-core').buildGitHubIssueTypeTemplate;

function parseRepoFullName(repoFullName) {
    var parts = String(repoFullName || '').split('/').filter(Boolean);
    if (parts.length < 2) {
        return { owner: '', repo: '' };
    }

    return {
        owner: parts[0],
        repo: parts.slice(1).join('/'),
    };
}

function normalizeLabelIds(labelIds) {
    return (Array.isArray(labelIds) ? labelIds : [])
        .map(function (id) {
            if (id === 0) return 0;
            if (id === null || id === undefined) return null;
            var trimmed = String(id).trim();
            if (!trimmed && trimmed !== '0') return null;
            var num = Number(trimmed);
            return isNaN(num) ? null : num;
        })
        .filter(function (num) { return num !== null; });
}

function buildIssueBody(options) {
    options = options || {};
    var body = '';

    if (options.issueType) {
        body += buildGitHubIssueTypeTemplate(options.issueType) || '';
    }

    if (options.includeUrl && options.currentTabUrl) {
        body += 'Reported from: ' + options.currentTabUrl + '\n\n';
    }

    if (options.includeDebug) {
        var env = options.env || {};
        body += '### Debug details: \n';
        body += 'User-agent: ' + (env.userAgent || '') + '\n';
        body += 'Cookies: ' + String(env.cookieEnabled) + ' (DNT: ' + (env.doNotTrack || '') + ')\n';
        body += 'Date/time: ' + (env.now || '') + '\n';
        body += '\n';
    }

    if (options.includeScreenshot) {
        body += '### Screenshot:\n\n';
        body += '<!-- drag in the screenshot file -->\n\n';
    }

    return body;
}

function buildCreateIssueParams(options) {
    options = options || {};
    var parsedRepo = parseRepoFullName(options.repoFullName);

    return {
        owner: parsedRepo.owner,
        repo: parsedRepo.repo,
        title: options.title || '',
        body: buildIssueBody({
            issueType: options.issueType,
            includeUrl: options.includeUrl,
            includeDebug: options.includeDebug,
            includeScreenshot: options.includeScreenshot,
            currentTabUrl: options.currentTabUrl,
            env: options.env,
        }),
        labels: normalizeLabelIds(options.labelIds),
    };
}

function buildIssueUrl(issue, options) {
    options = options || {};

    if (issue && issue.html_url) {
        return String(issue.html_url);
    }
    if (issue && issue.htmlUrl) {
        return String(issue.htmlUrl);
    }
    if (issue && issue.url && String(issue.url).indexOf('http') === 0) {
        return String(issue.url);
    }

    var apiBaseUrl = String(options.apiBaseUrl || '');
    var owner = String(options.owner || '');
    var repo = String(options.repo || '');
    var number = null;

    if (issue && typeof issue === 'object') {
        if (typeof issue.number === 'number') {
            number = issue.number;
        } else if (typeof issue.number === 'string' && issue.number.trim()) {
            var parsedNumber = Number(issue.number);
            if (!isNaN(parsedNumber)) {
                number = parsedNumber;
            }
        }
    }

    if (!apiBaseUrl || !owner || !repo || typeof number !== 'number') {
        return '';
    }

    var webBaseUrl = apiBaseUrl
        .replace(/\/$/, '')
        .replace(/\/api\/v1$/, '')
        .replace(/\/api\/v1\/$/, '')
        .replace(/\/$/, '');

    return webBaseUrl + '/' + owner + '/' + repo + '/issues/' + number;
}

module.exports = {
    buildCreateIssueParams: buildCreateIssueParams,
    buildIssueBody: buildIssueBody,
    buildIssueUrl: buildIssueUrl,
    normalizeLabelIds: normalizeLabelIds,
    parseRepoFullName: parseRepoFullName,
};
