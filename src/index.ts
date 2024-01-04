/*
 * Copyright 2022 Andrew Aylett
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Copyright 2023 Andrew Aylett
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { mkdtemp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import os from 'node:os';

import { expect } from './expect.js';

export interface TestDetails {
    name: string;
    testDirectory: string;
    projectDirectory: string;
}

export interface SpawnInstructions {
    cmd: string;
    args: string[];
    cwd?: string;
}

export async function testBuild(
    projectDirectoryRel: string,
    testParentLocation: string,
    testStep: (details: TestDetails) => Promise<SpawnInstructions>,
) {
    const projectDirectory = path.resolve(projectDirectoryRel);
    const testParentDirectory = path.resolve(
        projectDirectory,
        testParentLocation,
    );
    await test('Test Builds', async (ctx) => {
        const successfulTestBase = path.resolve(
            testParentDirectory,
            'successful',
        );
        await ctx.test(
            'Has a directory for successful test cases',
            async () => {
                await expect(successfulTestBase).isADirectory();
            },
        );
        const successful = await readdir(successfulTestBase);
        const failingTestBase = path.resolve(testParentDirectory, 'failing');
        await ctx.test('Has a directory for failing test cases', async () => {
            await expect(failingTestBase).isADirectory();
        });
        const failing = await readdir(failingTestBase);

        const cases = [
            ...successful.map((testcase) => ({
                base: successfulTestBase,
                testcase,
                pass: true,
            })),
            ...failing.map((testcase) => ({
                base: failingTestBase,
                testcase,
                pass: false,
            })),
        ];

        const tests = cases.map(async ({ base, pass, testcase }) =>
            ctx.test(
                `${testcase} should ${pass ? 'pass' : 'fail'}`,
                async (ctx) => {
                    const testCaseDirectory = path.resolve(base, testcase);
                    if (!(await stat(testCaseDirectory)).isDirectory()) {
                        ctx.skip('Not a directory');
                        return;
                    }
                    const buildDirectory = await mkdtemp(
                        path.join(os.tmpdir(), `test-build-${testcase}-`),
                    );
                    const testDirectory = path.resolve(
                        buildDirectory,
                        testcase,
                    );
                    await ctx.test(
                        `${testcase} should be a directory`,
                        async () => {
                            await expect(testCaseDirectory).isADirectory();
                        },
                    );
                    await ctx.test(`${testcase} should copy cleanly`, () =>
                        expect(
                            spawn('cp', [
                                '-r',
                                testCaseDirectory,
                                buildDirectory,
                            ]),
                        ).toSpawnSuccessfully(),
                    );
                    await ctx.test(
                        `${testcase} should link package under test cleanly`,
                        () =>
                            expect(
                                spawn(
                                    'npm',
                                    [
                                        'install',
                                        `file:${projectDirectory}`,
                                        '--save-dev',
                                    ],
                                    {
                                        cwd: testDirectory,
                                        stdio: 'inherit',
                                    },
                                ),
                            ).toSpawnSuccessfully(),
                    );
                    await ctx.test(`${testcase} should install cleanly`, () =>
                        expect(
                            spawn('npm', ['install', '--install-links'], {
                                cwd: testDirectory,
                                stdio: 'inherit',
                            }),
                        ).toSpawnSuccessfully(),
                    );
                    const spawnInstructions = await testStep({
                        name: testcase,
                        testDirectory,
                        projectDirectory,
                    });
                    await ctx.test(
                        `${testcase} should run ${spawnInstructions.cmd} ${
                            pass
                                ? 'successfully'
                                : 'and exit with a non-zero status code'
                        }`,
                        async () => {
                            const childProcess = spawn(
                                spawnInstructions.cmd,
                                spawnInstructions.args,
                                {
                                    cwd: spawnInstructions.cwd ?? testDirectory,
                                    stdio: 'pipe',
                                },
                            );

                            const allData: string[] = [];
                            childProcess.stdout.on('data', (data: string) =>
                                allData.push(data),
                            );
                            childProcess.stdout.pipe(process.stdout);
                            childProcess.stderr.pipe(process.stderr);

                            await expect(childProcess).toSpawnSuccessfully(
                                pass,
                            );

                            const blob = allData.join('');

                            const { assert } = (await import(
                                path.resolve(testCaseDirectory, 'expect.cjs')
                            )) as {
                                assert: (
                                    output: string,
                                    e: typeof expect,
                                ) => void;
                            };
                            assert(blob, expect);
                        },
                    );
                },
            ),
        );
        await Promise.all(tests);
    });
}
