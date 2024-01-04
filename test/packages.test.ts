import { testBuild } from '../src/index.js';

import type { SpawnInstructions, TestDetails } from '../src/index.js';

await testBuild(
    '.',
    'test',
    (details: TestDetails): Promise<SpawnInstructions> => {
        return Promise.resolve({
            cmd: 'npm',
            args: ['run', 'test'],
            cwd: details.testDirectory,
        });
    },
);
