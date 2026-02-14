import path from 'node:path';
import { describe, expect, it } from 'vitest';

import webpackConfig from '../webpack.config.js';

describe('webpack config', () => {
    it('targets popup/app.js and outputs to popup/dist/app.js', () => {
        // Arrange
        const expectedOutputPath = path.resolve(process.cwd(), 'popup/dist');

        // Act
        const entry = webpackConfig.entry;
        const output = webpackConfig.output;

        // Assert
        expect(entry).toBe('./popup/app.js');
        expect(output.filename).toBe('app.js');
        expect(output.path).toBe(expectedOutputPath);
    });
});
