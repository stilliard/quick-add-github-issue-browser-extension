import { describe, expect, it } from 'vitest';

import labelsCore from '../../popup/lib/destinations/gitea/gitea-labels-core.js';

const { filterLabels, normalizeHexColor, normalizeLabel } = labelsCore;

describe('gitea-labels-core', () => {

    it('filterLabels matches case-insensitive substrings', () => {
        const labels = [
            { id: 1, name: 'bug' },
            { id: 2, name: 'enhancement' },
            { id: 3, name: 'help wanted' },
        ];

        expect(filterLabels(labels, '')).toHaveLength(3);
        expect(filterLabels(labels, 'BUG')).toEqual([labels[0]]);
        expect(filterLabels(labels, 'help')).toEqual([labels[2]]);
    });

    it('filterLabels trims query and handles non-array inputs safely', () => {
        expect(filterLabels(undefined, 'bug')).toEqual([]);
        const labels = [{ id: 1, name: 'bug' }];
        expect(filterLabels(labels, '  bug  ')).toEqual(labels);
    });

    it('normalizeHexColor adds # and validates hex', () => {
        expect(normalizeHexColor('ff00aa')).toBe('#ff00aa');
        expect(normalizeHexColor('#ff00aa')).toBe('#ff00aa');
        expect(normalizeHexColor('xyz')).toBe('');
        expect(normalizeHexColor('')).toBe('');
    });

    it('normalizeLabel returns trimmed name/color/id', () => {
        const l = normalizeLabel({ id: 5, name: '  label  ', color: 'ff00aa' });
        expect(l.id).toBe(5);
        expect(l.name).toBe('label');
        expect(l.color).toBe('ff00aa');
    });

});
