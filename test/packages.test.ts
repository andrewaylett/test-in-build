import { testBuild } from '../src/index.js';

await testBuild('.', 'test', (details) => ({
    cmd: 'npm',
    args: ['run', 'test'],
    cwd: details.testDirectory,
}));
