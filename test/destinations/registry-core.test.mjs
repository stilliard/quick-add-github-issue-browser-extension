import { describe, expect, it } from 'vitest';

import registryCore from '../../popup/lib/destinations/registry-core.js';

const { getDestinationKeyFromStore } = registryCore;

describe('registry-core', () => {

    it('defaults to github when destination is missing', () => {
        expect(getDestinationKeyFromStore(null)).toBe('github');
        expect(getDestinationKeyFromStore({})).toBe('github');
        expect(getDestinationKeyFromStore({ destination: '' })).toBe('github');
    });

    it('uses gitea when destination is gitea', () => {
        expect(getDestinationKeyFromStore({ destination: 'gitea' })).toBe('gitea');
    });

});
