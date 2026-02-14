import { describe, expect, it } from 'vitest';

import githubCore from '../../popup/lib/destinations/github/github-core.js';

const {
    createGitHubNewIssueUrl,
    buildGitHubIssueTypeTemplate,
    createGitHubIssueDraft,
} = githubCore;

describe('github-core', () => {

    it('buildGitHubIssueTypeTemplate builds bug template', () => {
        const body = buildGitHubIssueTypeTemplate('bug');
        expect(body).toContain('### Issue description:');
        expect(body).toContain('As a User/Admin/Developer');
    });

    it('createGitHubNewIssueUrl includes title and optionally projects/body/labels', () => {
        const url = createGitHubNewIssueUrl({
            repoFullName: 'octo/repo',
            title: 'My title',
            project: 'octo/1',
            labels: 'bug',
            body: 'Hello',
        });

        expect(url).toContain('https://github.com/octo/repo/issues/new');
        expect(url).toContain('title=My%20title');
        expect(url).toContain('projects=octo%2F1');
        expect(url).toContain('labels=bug');
        expect(url).toContain('body=Hello');
    });

    it('createGitHubIssueDraft builds URL, includes description, and indicates screenshot capture', () => {
        const draft = createGitHubIssueDraft({
            repoFullName: 'octo/repo',
            title: 'T',
            description: 'Desc',
            project: '',
            issueType: 'enhancement',
            includeUrl: true,
            includeDebug: true,
            includeScreenshot: true,
            currentTabUrl: 'https://example.com',
            env: {
                userAgent: 'UA',
                cookieEnabled: true,
                doNotTrack: '1',
                now: 'NOW',
            },
        });

        expect(draft.url).toContain('https://github.com/octo/repo/issues/new');
        expect(draft.url).toContain('labels=enhancement');
        expect(draft.url).toContain('Desc');
        expect(draft.shouldCaptureScreenshot).toBe(true);
    });

});
