import { describe, expect, it } from 'vitest';

import * as destinations from '../../popup/lib/destinations/index.js';
import * as githubCore from '../../popup/lib/destinations/github/github-core.js';

const { DESTINATION_KEYS, getDestinationProvider } = destinations;

describe('destination routing', () => {

    it('provider selection defaults to GitHub when destination is missing or empty', () => {
        const providerFromNull = getDestinationProvider(null);
        const providerFromEmpty = getDestinationProvider({ destination: '' });

        expect(providerFromNull.key).toBe(DESTINATION_KEYS.GITHUB);
        expect(providerFromEmpty.key).toBe(DESTINATION_KEYS.GITHUB);
    });

    it('provider selection returns Gitea when destination is gitea', () => {
        const provider = getDestinationProvider({ destination: 'gitea' });

        expect(provider.key).toBe(DESTINATION_KEYS.GITEA);
    });

    it('GitHub provider still builds issue drafts/URLs as before', () => {
        const draft = githubCore.createGitHubIssueDraft({
            repoFullName: 'octo/repo',
            title: 'Sample title',
            project: 'octo/42',
            issueType: 'bug',
            includeUrl: true,
            includeDebug: true,
            includeScreenshot: false,
            currentTabUrl: 'https://example.com/context',
            env: {
                userAgent: 'UA',
                cookieEnabled: true,
                doNotTrack: '1',
                now: 'NOW',
            },
        });

        expect(draft.url).toContain('https://github.com/octo/repo/issues/new');
        expect(draft.url).toContain('title=Sample%20title');
        expect(draft.url).toContain('projects=octo%2F42');
        expect(draft.url).toContain('labels=bug');
        expect(draft.url).toContain('body=');
        expect(draft.shouldCaptureScreenshot).toBe(false);
    });
});
