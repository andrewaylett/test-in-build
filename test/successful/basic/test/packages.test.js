import { testBuild } from 'test-build';

await testBuild('.', 'test', (details) => {
    return Promise.resolve({
        cmd: 'npm',
        args: ['run', 'test'],
        cwd: details.testDirectory,
    });
});
