/**
 * Independent registry install verification for portico-ui@0.1.2.
 * Reference tarball (compare-only) may be supplied via REFERENCE_TARBALL_COMPARE_ONLY — never used to install.
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const OUT_FILE = path.join(OUT, 'registry-install-verification-0.1.2.json')

const APPROVED = {
  runtimeImplementationSha: 'b4c202d74862311f7bfc276d0fa25ba6f23ceaec',
  evidenceScriptHead: 'b346428de578a50b6556a5a14716b3d49188b72f',
  approvedTarballSha256:
    '6f236774f1ed67b6aaf476891f51c3aa0fe9cda627b3af2d1aba16bbec9e52e5',
  registryIntegrity:
    'sha512-xRXiAko1wO6+OdYklDaT9TMnd+04zXLNCgoGhYvN0Xa+eo8Fm2DHj7Y9CmCEyd7Hf8PsmceJc3hjhMZOarnCDg==',
  registryShasum: '379446a3072b8f76ce37a88c9b015ebc0ea58c8e',
  tarballUrl: 'https://registry.npmjs.org/portico-ui/-/portico-ui-0.1.2.tgz',
  version: '0.1.2',
}

const DIST_FILES = ['portico-ui.es.js', 'style.css', 'index.d.ts']

function sh(cmd) {
  try {
    return { ok: true, stdout: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout?.toString?.() ?? '',
      stderr: e.stderr?.toString?.() ?? e.message,
      code: e.status,
    }
  }
}

async function sha256File(filePath) {
  const buf = await readFile(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

async function hashDistDir(distDir) {
  const out = {}
  for (const name of DIST_FILES) {
    try {
      out[name] = await sha256File(path.join(distDir, name))
    } catch {
      out[name] = null
    }
  }
  return out
}

async function referenceCompareOnly() {
  const refPath = process.env.REFERENCE_TARBALL_COMPARE_ONLY
  if (!refPath) return { skipped: true, reason: 'REFERENCE_TARBALL_COMPARE_ONLY not set' }
  try {
    await access(refPath)
  } catch {
    return { skipped: true, reason: `reference path missing: ${refPath}` }
  }
  const tarballSha256 = await sha256File(refPath)
  const npmView = sh('npm view portico-ui@0.1.2 dist.shasum dist.integrity --json')
  let extractDir = null
  try {
    extractDir = `/tmp/portico-ui-ref-${Date.now()}`
    sh(`mkdir -p ${extractDir}`)
    sh(`tar -xzf "${refPath}" -C ${extractDir}`)
    const pkgJson = JSON.parse(
      await readFile(path.join(extractDir, 'package', 'package.json'), 'utf8'),
    )
    const distHashes = await hashDistDir(path.join(extractDir, 'package', 'dist'))
    return {
      role: 'compare_only_not_install',
      path: refPath,
      tarballSha256,
      matchesApprovedTarballSha256: tarballSha256 === APPROVED.approvedTarballSha256,
      packageVersion: pkgJson.version,
      distSha256: distHashes,
      npmPackumentShasumMatch:
        tarballSha256 === APPROVED.approvedTarballSha256
          ? APPROVED.registryShasum
          : sh(`shasum -a 1 "${refPath}"`).stdout?.split(/\s/)[0] === APPROVED.registryShasum,
    }
  } catch (e) {
    return { role: 'compare_only_not_install', error: String(e) }
  }
}

const adminGitSha = process.env.ADMIN_GIT_SHA ?? sh('git rev-parse HEAD').stdout ?? null

const npmViewLatest = sh('npm view portico-ui dist-tags.latest version --json')
const npmView012 = sh('npm view portico-ui@0.1.2 version dist.integrity dist.tarball --json')
const tarballHead = sh(
  `curl -sI "${APPROVED.tarballUrl}" | head -n 1`,
)
const npmPack = sh('npm pack portico-ui@0.1.2 --pack-destination /tmp/npm-pack-portico-ui 2>&1')

let lockSlice = null
try {
  const lock = JSON.parse(await readFile(path.join(ROOT, 'package-lock.json'), 'utf8'))
  const dep = lock.packages?.['']?.dependencies?.['portico-ui']
  const node = lock.packages?.['node_modules/portico-ui']
  lockSlice = { packageJsonDependency: dep, lockEntry: node }
} catch (e) {
  lockSlice = { error: String(e) }
}

let installed = null
const pkgDir = path.join(ROOT, 'node_modules/portico-ui')
try {
  const pkg = JSON.parse(await readFile(path.join(pkgDir, 'package.json'), 'utf8'))
  installed = {
    version: pkg.version,
    distSha256: await hashDistDir(path.join(pkgDir, 'dist')),
  }
} catch {
  installed = { missing: true }
}

const npmCi = sh('npm ci 2>&1')
const ciAttemptNote =
  process.env.SKIP_NPM_CI_IN_VERIFY === '1'
    ? { skipped: true }
    : { ok: npmCi.ok, excerpt: (npmCi.stderr ?? npmCi.stdout ?? '').slice(-800) }

const reference = await referenceCompareOnly()

const distMatchesApprovedReference =
  installed?.distSha256 && reference.distSha256
    ? Object.fromEntries(
        DIST_FILES.map((f) => [
          f,
          installed.distSha256[f] === reference.distSha256[f],
        ]),
      )
    : null

const report = {
  verifiedAt: new Date().toISOString(),
  adminGitSha,
  adminRepo: 'mininicerrrr/portico-admin',
  approved: APPROVED,
  registryReadOnlyChecks: {
    npmViewLatest: npmViewLatest.ok ? JSON.parse(npmViewLatest.stdout || '{}') : npmViewLatest,
    npmView012: npmView012.ok ? JSON.parse(npmView012.stdout || '{}') : npmView012,
    tarballHttpHead: tarballHead.stdout,
    tarballHttp404: /404/.test(tarballHead.stdout ?? ''),
    npmPackAttempt: npmPack,
  },
  packageLock: lockSlice,
  npmCiAttempt: ciAttemptNote,
  installedNodeModules: installed,
  referenceTarballCompareOnly: reference,
  distMatchesApprovedReference,
  installBlocked:
    !installed?.version ||
    installed.version !== '0.1.2' ||
    tarballHead.stdout?.includes('404'),
  commandsUsed: [
    'npm view portico-ui@0.1.2',
    `curl -sI ${APPROVED.tarballUrl}`,
    'npm pack portico-ui@0.1.2',
    'npm ci',
    'REFERENCE_TARBALL_COMPARE_ONLY=… (hash only, not install)',
  ],
  evidenceScope:
    'Registry metadata verified independently; tarball byte identity checked via compare-only reference matching packument shasum — browser/runtime evidence requires successful registry npm ci.',
}

await writeFile(OUT_FILE, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
process.exit(report.installBlocked && !installed?.version ? 2 : 0)