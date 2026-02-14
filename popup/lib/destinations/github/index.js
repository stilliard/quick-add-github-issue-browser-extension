
const { Octokit } = require('@octokit/rest');
const { createGitHubDestination } = require('./github-destination');

module.exports = createGitHubDestination({ Octokit: Octokit });
