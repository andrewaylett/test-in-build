# Test Build

Installs your package into a test project, and verifies the result.

## Rationale

If you're developing a node-based tool that participates in the build process,
you need to be able to validate both how it _works_ and how it _fails_.
This can be tricky to do in a single project, so instead we create a selection
of (hopefully simpler) test projects and install our tool _there_.

## How it works

We don't build our test projects in-situ, because we don't want the act of
testing them to modify them. So we copy the test into a temporary directory and
install the package under test into it there.

The calling package needs to specify what the actual test step should look like.
Normally this will entail calling `npm`, or possibly another tool like `tsc` if
you don't want to set up all your test projects with a complete build
environment.

`test-in-build` will load a JS file called `expect.cjs`. This gives test
authors the ability to inspect the build output for correctness

## Use

Recommended usage follows the pattern in
[test/packages.test.ts](test/packages.test.ts).
You need to pass in the project base directory, relative to the working
directory when the test is executed. This will normally be `'.'`, unless you
have a workspace project. The second parameter is the parent directory for
your `successful` and `failing` directories -- these should themselves contain
a directory per test case.

The third parameter gives the caller the opportunity to inspect the test and
request a command to be executed. You may make this function as complex as you
like, but I'd recommend putting per-test logic in the test itself.

## Releasing

We use `npm versions` and GitHub Actions to release.

On your local machine, with `main` checked out,
run `npm version patch` or whatever bump is appropriate.
This will create a new commit and a tag starting with `v` containing the
version.
Push the tag to GitHub.
We protect tags starting with `v`, so this step may only be undertaken by
repository administrators.

In the GitHub UI, wait until the tag has finished its CI build.
Now we may push the `main` branch without hitting branch protections.
Do so.

Again in the GitHub UI, find the tag.
Use the three dot menu on the tag to create a release.
Use the auto-fill button to populate the release notes, and publish the release.

GitHub Actions will now build the release and publish it to NPM.
