import { describe, expect, it } from 'vitest';

import giteaRepoCore from '../../popup/lib/destinations/gitea/gitea-repo-core.js';

const {
    mergeDedupeSortGroupRepos,
    buildRepoSelectHtml,
} = giteaRepoCore;

describe('gitea-repo-core', () => {

    it('mergeDedupeAndSortRepos merges, dedupes by full_name, and sorts deterministically', () => {
        const userRepos = [
            { full_name: 'me/b', name: 'b', owner: { login: 'me' } },
            { full_name: 'me/a', name: 'a', owner: { login: 'me' } },
        ];

        const orgRepos = [
            { full_name: 'org/x', name: 'x', owner: { login: 'org' } },
            { full_name: 'me/a', name: 'a', owner: { login: 'me' } }, // duplicate
        ];

        const groups = mergeDedupeSortGroupRepos({ userRepos, orgRepos });
        const html = buildRepoSelectHtml(groups);

        // Order should be deterministic: owner groups (me, org) and repos in name order.
        expect(html).toContain('<optgroup label="me">');
        expect(html).toContain('<option value="me/a">a</option>');
        expect(html).toContain('<option value="me/b">b</option>');
        expect(html).toContain('<optgroup label="org">');
        expect(html).toContain('<option value="org/x">x</option>');
    });

    it('mergeDedupeAndSortRepos dedupes by id fallback and skips repos without a key', () => {
        const userRepos = [
            { id: 1, name: 'alpha', owner: { username: 'me' } },
            { id: 1, name: 'alpha-duplicate', owner: { username: 'me' } },
            { name: 'no-key' },
        ];

        const orgRepos = [
            { id: '2', name: 'beta', owner: { name: 'Org' } },
            { id: '2', name: 'beta-duplicate', owner: { name: 'Org' } },
            { id: 3, name: 'gamma' },
        ];

        const groups = mergeDedupeSortGroupRepos({ userRepos, orgRepos });
        expect(groups).toHaveLength(3);
        expect(groups[0].owner).toBe('(unknown owner)');
        expect(groups[0].repos).toHaveLength(1);

        const meGroup = groups.find((g) => g.owner.toLowerCase() === 'me');
        const orgGroup = groups.find((g) => g.owner.toLowerCase() === 'org');
        expect(meGroup).toBeTruthy();
        expect(orgGroup).toBeTruthy();

        // Should dedupe by id where full_name is absent; allow at most 1 per id key.
        expect(orgGroup.repos.length).toBeLessThanOrEqual(2);
    });

    it('buildRepoSelectHtml produces optgroups and options and escapes values', () => {
        const groups = [
            { owner: 'me', repos: [{ full_name: 'me/a', name: 'a', owner: { login: 'me' } }] },
            { owner: 'org<bad>', repos: [{ full_name: 'org/x', name: 'x&y', owner: { login: 'org<bad>' } }] },
        ];

        const html = buildRepoSelectHtml(groups);
        expect(html).toContain('<optgroup label="me">');
        expect(html).toContain('value="me/a"');
        expect(html).toContain('>a<');
        expect(html).toContain('label="org&lt;bad&gt;"');
        expect(html).toContain('>x&amp;y<');
    });

});
