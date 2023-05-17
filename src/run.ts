import * as core from '@actions/core'
import * as github from '@actions/github'
import * as cp from 'child_process'
import * as git from './git'

export async function run(): Promise<void> {
  core.info('Starting...')

  const comment = core.getInput('leave-comment') === 'true'
  const baseBranch = core.getInput('base-branch') || 'main'
  const flags = core.getInput('flags') || '--noEmit --incremental false'
  const treshold = parseInt(core.getInput('treshold')) || 300 // ms
  const githubToken: string | undefined =
    core.getInput('github-token') || undefined

  try {
    const newResult = cp.execSync(`npx tsc ${flags} --extendedDiagnostics`)

    await git.cmd([], 'checkout', baseBranch)
    const previousResult = cp.execSync('tsc ${flags} --extendedDiagnostics')

    const diff = compareDiagnostics(
      newResult.toString(),
      previousResult.toString(),
      treshold
    )

    core.info(diff)
    if (comment) {
      if (!githubToken) {
        throw new Error(
          `'github-token' is not set. Please give API token to send commit comment`
        )
      }
      await leaveComment(diff, githubToken)
    }

    core.info('Finished!')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const getCurrentRepoMetadata = () => {
  const {repo, owner} = github.context.repo
  const serverUrl = git.getServerUrl(
    github.context.payload.repository?.html_url
  )
  return {
    name: repo,
    owner: {
      login: owner
    },

    html_url: `${serverUrl}/${owner}/${repo}`
  }
}

const getCurrentPRID = () => {
  const pr = github.context.payload.pull_request
  if (!pr) {
    throw new Error('This action can only be run in PR context')
  }
  return pr.number
}

const leaveComment = async (body: string, token: string) => {
  core.debug(`Sending comment:\n${body}`)

  const repoMetadata = getCurrentRepoMetadata()
  const client = github.getOctokit(token)
  const {data: createCommentResponse} = await client.rest.issues.createComment({
    owner: repoMetadata.owner.login,
    repo: repoMetadata.name,
    issue_number: getCurrentPRID(),
    body
  })

  return createCommentResponse
}

type Diagnostics = {
  [key: string]: number
}

function parseDiagnostics(input: string): Diagnostics {
  const diagnostics: Diagnostics = {}
  const lines = input.split('\n')

  for (const line of lines) {
    const parts = line.split(':')
    if (parts.length === 2) {
      // Convert all time values to milliseconds for comparison
      const value = parseFloat(parts[1]) * (parts[1].includes('s') ? 1000 : 1)
      diagnostics[parts[0].trim()] = value
    }
  }

  return diagnostics
}

function compareDiagnostics(
  first: string,
  second: string,
  threshold: number
): string {
  const firstDiagnostics = parseDiagnostics(first)
  const secondDiagnostics = parseDiagnostics(second)

  let markdown = '## Comparing Diagnostics:\n\n'
  markdown += '| Metric | Difference | Status |\n'
  markdown += '| --- | --- | --- |\n'

  for (const key in {...firstDiagnostics, ...secondDiagnostics}) {
    const firstValue = firstDiagnostics[key] || 0
    const secondValue = secondDiagnostics[key] || 0

    const diff = secondValue - firstValue
    let diffPercentage = firstValue !== 0 ? (diff / firstValue) * 100 : 0

    if (isNaN(diffPercentage)) diffPercentage = 0

    const shouldApplyThreshold = key.toLowerCase().includes('time')
    const isWithinThreshold = Math.abs(diff) <= threshold

    if (!shouldApplyThreshold || (shouldApplyThreshold && !isWithinThreshold)) {
      let status = diff > 0 ? '▲' : '▼'
      if (diff === 0) status = '±'
      markdown += `| ${key} | ${diff.toFixed(2)} (${diffPercentage.toFixed(
        2
      )}%) | ${status} |\n`
    } else {
      markdown += `| ${key} | ${diff.toFixed(2)} (${diffPercentage.toFixed(
        2
      )}%) | ± |\n`
    }
  }

  return markdown
}
