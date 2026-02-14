
const {
    buildRepoSelectHtml,
    createGitHubIssueDraft,
    groupReposByOwner
} = require('./github-core');

function createGitHubDestination(deps) {
    const Octokit = deps.Octokit;

    function fetchRepos(store) {
        const octokit = new Octokit({ auth: store.token });
        const listRepos = store.org ? octokit.rest.repos.listForOrg : octokit.rest.repos.listForAuthenticatedUser;

        return listRepos({ org: store.org }).then(function (response) {
            const orgs = groupReposByOwner(response.data);

            if (! store.org) {
                return orgs;
            }

            return octokit.rest.repos.listForAuthenticatedUser().then(function (userResponse) {
                (userResponse.data || []).forEach(function (repo) {
                    const orgName = repo && repo.owner && repo.owner.login;
                    if (! orgName) return;
                    orgs[orgName] = orgs[orgName] || [];
                    orgs[orgName].push(repo);
                });

                return orgs;
            });
        });
    }

    function fetchProjects(store) {
        if (! store.org) return Promise.resolve(null);

        const octokit = new Octokit({ auth: store.token });
        return octokit.graphql(
            `query listProjects($org: String!, $count: Int = 100, $query: String = "is:open") {
                organization(login: $org) {
                    projectsV2 (first: $count, query: $query) {
                        nodes { number, title }
                    }
                }
            }`,
            { org: store.org }
        );
    }

    function buildProjectSelectHtml(store, data) {
        const projects = { v2: [], classic: [] };

        data?.organization?.projectsV2?.nodes?.forEach(function (project) {
            projects.v2.push({ number: project.number, name: project.title });
        });

        data?.organization?.projects?.nodes?.forEach(function (project) {
            projects.classic.push(project);
        });

        const list = Object.keys(projects).map(function (projectType) {
            const options = projects[projectType].map(function (project) {
                return '<option value="' + store.org + '/' + project.number + '">' + project.name + '</option>';
            });
            return options.length ? '<optgroup label="' + projectType + '">' + options.join('') + '</optgroup>' : '';
        });

        return '<option>~ optional ~</option>' + list.join('');
    }

    function populateRepoSelect($screen, store) {
        $screen.find('#repo').html('<option>loading...</option>');

        return fetchRepos(store).then(function (orgs) {
            $screen.find('#repo').html(buildRepoSelectHtml(orgs));
        }).catch(function () {
            $screen.find('#repo').html('<option>Failed to load repos</option>');
        });
    }

    function populateProjectSelect($screen, store) {
        if (! store.org) {
            $screen.find('#project-container').hide();
            return Promise.resolve();
        }

        $screen.find('#project-container').show();
        $screen.find('#project').html('<option>loading...</option>');

        return fetchProjects(store).then(function (data) {
            $screen.find('#project').html(buildProjectSelectHtml(store, data));
        }).catch(function () {
            $screen.find('#project').html('<option>Failed to load projects</option>');
        });
    }

    function wireSettingsLink($screen, store) {
        $screen.off('click', '#settings-link');
        $screen.on('click', '#settings-link', function (e) {
            e.preventDefault();
            Screen.show('settings', store);
        });
    }

    function wireSubmitHandler($screen, store) {
        $screen.off('submit', '#report-issue-form');
        $screen.on('submit', '#report-issue-form', function (e) {
            e.preventDefault();

            const title = $screen.find('#title').val();
            const description = $screen.find('#description').val();
            const repoFullName = $screen.find('#repo').val();
            const project = $screen.find('#project').val();
            const includeUrl = $screen.find('#added_url').prop('checked');
            const includeScreenshot = $screen.find('#added_screenshot').prop('checked');
            const includeDebug = $screen.find('#added_debug').prop('checked');
            const issueType = $screen.find('#type_field input[name="type"]:checked').val();

            chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
                const currentTabUrl = tabs && tabs[0] && tabs[0].url;

                const draft = createGitHubIssueDraft({
                    title: title,
                    description: description,
                    repoFullName: repoFullName,
                    project: project,
                    issueType: issueType,
                    includeUrl: includeUrl,
                    includeDebug: includeDebug,
                    includeScreenshot: includeScreenshot,
                    currentTabUrl: currentTabUrl,
                    env: {
                        userAgent: navigator.userAgent,
                        cookieEnabled: navigator.cookieEnabled,
                        doNotTrack: navigator.doNotTrack,
                        now: Date()
                    }
                });

                function openGitHubTab() {
                    chrome.tabs.create({ url: draft.url });
                }

                if (! draft.shouldCaptureScreenshot) {
                    openGitHubTab();
                    return;
                }

                chrome.tabs.captureVisibleTab(function (imageUri) {
                    download(imageUri, 'screenshot.png');
                    setTimeout(openGitHubTab, 300); // small delay to allow download
                });
            });
        });
    }

    return {
        key: 'github',
        onShowReportIssue: function (args) {
            const $screen = args.$screen;
            const store = args.store || {};

            $screen.find('#report-issue-form input[type="submit"]').prop('disabled', false);

            Promise.all([
                populateRepoSelect($screen, store),
                populateProjectSelect($screen, store)
            ]).then(function () {
                setTimeout(function () {
                    IssueForm.init($screen);
                }, 300);
            });

            wireSettingsLink($screen, store);
            wireSubmitHandler($screen, store);
        }
    };
}

module.exports = {
    createGitHubDestination
};
