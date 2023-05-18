# TypeScript Performance Diagnostics Diff Action

This GitHub action allows you to measure and track TypeScript performance regressions in your projects by comparing `tsc --diagnostics` (or `--extendedDiagnostics` based on your configuration) outputs between the base branch and the current branch.

## Inputs

- `base-branch`: The branch that the actions should use to compare TSC performance (default: 'main').
- `custom-command`: Allows to override the default type check command. Your custom command should print either --diagnostics or --extendedDiagnostics output. (default: `yarn tsc --noEmit --incremental false --diagnostics/--extendedDiagnostics`).
- `leave-comment`: Indicates whether the action should leave a comment on a PR. Enabling this requires providing the github-token input (default: false).
- `github-token`: GitHub API token. Necessary to leave comments on your PRs.
- `extended`: Indicates whether the actions should use --extendedDiagnostics over --diagnostics (default: false).

## Usage

You can add this action to your workflow file like this:

```yaml
name: Check TypeScript Performance

on:
  pull_request:

jobs:
  check-performance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Use Node.js 16.x
        uses: actions/setup-node@v2
        with:
          node-version: 16.x
      - name: Install dependencies
        run: npm ci
      - name: TSC Diagnostics Diff
        uses: beerose/tsc-diagnostics-diff@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          leave-comment: true
```

This example uses `GITHUB_TOKEN` to leave a comment on PRs with the diagnostics comparison.

## Example output



## Development

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:

```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Change action.yml

The action.yml defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your action.

See the [documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

See the [toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) for the various packages.

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with: ...
```

See the [actions tab](https://github.com/actions/typescript-action/actions) for runs of this action! :rocket:

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
