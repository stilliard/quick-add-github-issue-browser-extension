
function groupReposByOwner(repos) {
    const orgs = {};

    (repos || []).forEach(function (repo) {
        const orgName = repo && repo.owner && repo.owner.login;
        if (! orgName) return;
        orgs[orgName] = orgs[orgName] || [];
        orgs[orgName].push(repo);
    });

    return orgs;
}

function buildRepoSelectHtml(orgs) {
    const list = Object.keys(orgs || {}).map(function (org) {
        const options = (orgs[org] || []).map(function (repo) {
            return '<option value="' + repo.full_name + '">' + repo.name + '</option>';
        });
        return '<optgroup label="' + org + '">' + options.join('') + '</optgroup>';
    });

    return list.join('');
}

function createGitHubNewIssueUrl(params) {
    const repoFullName = params.repoFullName;
    const title = params.title;
    const project = params.project;
    const labels = params.labels;
    const body = params.body;

    let url = 'https://github.com/' + repoFullName + '/issues/new?title=' + encodeURIComponent(title || '');

    if (project) {
        url += '&projects=' + encodeURIComponent(project);
    }

    if (labels) {
        url += '&labels=' + encodeURIComponent(labels);
    }

    if (body) {
        url += '&body=' + encodeURIComponent(body);
    }

    return url;
}

function buildGitHubIssueTypeTemplate(issueType) {
    if (issueType === 'bug') {
        return [
            '### Issue description:',
            '',
            'As a User/Admin/Developer',
            'When I <steps to reproduce>',
            'Currently it <what happens currently>',
            'While it should <what should happen>',
            'Because <some business value>',
            '',
            ''
        ].join('\n');
    }

    if (issueType === 'enhancement') {
        return [
            '### Story:',
            '',
            'As a User/Admin/Developer',
            'I want <some software feature>',
            'So that <some business value>',
            '',
            '### Requirements:',
            '',
            '- list them here',
            '',
            '### Tasks:',
            '',
            '- [ ] ',
            '- [ ] ',
            '- [ ] ',
            '',
            ''
        ].join('\n');
    }

    return '';
}

function createGitHubIssueDraft(params) {
    const title = params.title;
    const repoFullName = params.repoFullName;
    const project = params.project;
    const issueType = params.issueType;
    const includeUrl = params.includeUrl;
    const includeDebug = params.includeDebug;
    const includeScreenshot = params.includeScreenshot;
    const currentTabUrl = params.currentTabUrl;
    const env = params.env || {};

    let body = '';
    let labels = '';

    if (issueType) {
        labels = issueType;
        body += buildGitHubIssueTypeTemplate(issueType);
    }

    if (includeUrl && currentTabUrl) {
        body += 'Reported from: ' + currentTabUrl + '\n\n';
    }

    if (includeDebug) {
        body += '### Debug details: \n';
        body += 'User-agent: ' + (env.userAgent || '') + '\n';
        body += 'Cookies: ' + String(env.cookieEnabled) + ' (DNT: ' + (env.doNotTrack || '') + ')\n';
        body += 'Date/time: ' + (env.now || '') + '\n';
        body += '\n';
    }

    if (includeScreenshot) {
        body += '### Screenshot:\n\n';
        body += '<!-- drag in the screenshot file -->\n\n';
    }

    return {
        url: createGitHubNewIssueUrl({
            repoFullName: repoFullName,
            title: title,
            project: project,
            labels: labels,
            body: body
        }),
        shouldCaptureScreenshot: Boolean(includeScreenshot)
    };
}

module.exports = {
    buildRepoSelectHtml,
    buildGitHubIssueTypeTemplate,
    createGitHubIssueDraft,
    createGitHubNewIssueUrl,
    groupReposByOwner
};
