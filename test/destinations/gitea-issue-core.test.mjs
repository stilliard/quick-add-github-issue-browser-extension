import { describe, expect, it } from 'vitest';

import giteaIssueCore from '../../popup/lib/destinations/gitea/gitea-issue-core.js';

const {
    buildCreateIssueParams,
    buildIssueBody,
    buildIssueUrl,
    normalizeLabelIds,
    parseRepoFullName,
} = giteaIssueCore;

describe('gitea-issue-core', () => {

    it('parses repo full name into owner and repo', () => {
        const parsed = parseRepoFullName('octo/hello-world');
        expect(parsed).toEqual({ owner: 'octo', repo: 'hello-world' });

        const invalid = parseRepoFullName('');
        expect(invalid).toEqual({ owner: '', repo: '' });
    });

    it('builds issue body with optional sections and description', () => {
        const body = buildIssueBody({
            issueType: 'bug',
            description: 'Desc line',
            includeUrl: true,
            includeDebug: true,
            includeScreenshot: true,
            currentTabUrl: 'https://example.com',
            env: {
                userAgent: 'UA',
                cookieEnabled: false,
                doNotTrack: '1',
                now: 'NOW'
            }
        });

        expect(body).toContain('### Issue description:');
        expect(body).toContain('Desc line');
        expect(body).toContain('Reported from: https://example.com');
        expect(body).toContain('### Debug details:');
        expect(body).toContain('### Screenshot:');
    });

    it('converts label ids to numbers and ignores invalid values', () => {
        const labels = normalizeLabelIds(['1', 2, 'not-a-number', '3']);
        expect(labels).toEqual([1, 2, 3]);
    });

    it('normalizeLabelIds keeps numeric zeros and trims whitespace', () => {
        const labels = normalizeLabelIds([' 4 ', 0, null, '', ' 0 ']);
        expect(labels).toEqual([4, 0, 0]);
    });

    it('builds create issue params with body and labels', () => {
        const params = buildCreateIssueParams({
            repoFullName: 'octo/repo',
            title: 'My title',
            issueType: 'enhancement',
            description: 'My desc',
            includeUrl: false,
            includeDebug: false,
            includeScreenshot: true,
            labelIds: ['5', '6'],
        });

        expect(params.owner).toBe('octo');
        expect(params.repo).toBe('repo');
        expect(params.title).toBe('My title');
        expect(params.labels).toEqual([5, 6]);
        expect(params.body).toContain('### Story:');
        expect(params.body).toContain('My desc');
        expect(params.body).toContain('### Screenshot:');
    });

    it('builds issue url from html_url or falls back to web url', () => {
        const issue = { html_url: 'https://gitea.example.com/octo/repo/issues/12' };
        expect(buildIssueUrl(issue, { apiBaseUrl: 'https://gitea.example.com/api/v1', owner: 'octo', repo: 'repo' }))
            .toBe(issue.html_url);

        const fallback = buildIssueUrl({ number: 7 }, { apiBaseUrl: 'https://gitea.example.com/api/v1', owner: 'octo', repo: 'repo' });
        expect(fallback).toBe('https://gitea.example.com/octo/repo/issues/7');
    });

    it('buildIssueUrl returns empty string when details are incomplete', () => {
        expect(buildIssueUrl({ number: 1 }, { apiBaseUrl: '', owner: 'me', repo: 'repo' })).toBe('');
        expect(buildIssueUrl({ }, { apiBaseUrl: 'https://gitea.example.com/api/v1', owner: 'me', repo: 'repo' })).toBe('');
    });
});
