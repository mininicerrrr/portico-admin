/**
 * Independent registry install verification for portico-ui@0.1.3.
 * Reference tarball (compare-only) may be supplied via REFERENCE_TARBALL_COMPARE_ONLY — never used to install.
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const OUT_FILE = path.join(OUT, 'registry-install-verification-0.1.3.json')

const APPROVED = {
  tarballSha256: '025aa12d873dbd4bf2c1d40299394598d106b0fcd32833ea9430bba5d0040db4',
  registryIntegrity:
    'sha512-WVOKQqDyyY3eT9Wn1uopUjI5Ro7iWX4y/rGOux8Wm5q3eSd08k9TBKNX9KWW2qxr9oEe5XffGyOLH777oGoTcA==',
  registryShasum: '081078b825456d931837557a37c81129e8e029a5',
  tarballUrl: 'https://registry.npmjs.org/portico-ui/-/portico-ui-0.1.3.tgz',
  version: '0.1.3',
  distSha256FromRegistryTarball: {
    'portico-ui.es.js': '8039081aab9267ff9e48e2b83e720ece035da257b50fea045683d97d59f0f535',
    'style.css': '08eef83e84d77c955a9b783166a3911041374bbaefa97f46e15065cce69869b7',
    'index.d.ts': 'db8e4195aeeee38f430c4de55d82f0f93e9c3c8ca64a1b6966aabc89ca8d5599',
  },
}

const DIST_FILES = ['portico-ui.es.js', 'style.css', 'index.d.ts']

function sh(cmd, env = {}) {
  try {
    return {
      ok: true,
      stdout: execSync(cmd, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
      }).trim(),
    }
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
  try {
    const extractDir = `/tmp/portico-ui-ref-${Date.now()}`
    sh(`mkdir -p ${extractDir}`)
    sh(`tar -xzf "${refPath}" -C ${extractDir}`)
    const pkgJson = JSON.parse(await readFile(path.join(extractDir, 'package', 'package.json'), 'utf8'))
    const distHashes = await hashDistDir(path.join(extractDir, 'package', 'dist'))
    return {
      role: 'compare_only_not_install',
      path: refPath,
      tarballSha256,
      matchesApprovedTarballSha256: tarballSha256 === APPROVED.tarballSha256,
      packageVersion: pkgJson.version,
      distSha256: distHashes,
    }
  } catch (e) {
    return { role: 'compare_only_not_install', error: String(e) }
  }
}

const adminGitSha = process.env.ADMIN_GIT_SHA ?? sh('git rev-parse HEAD').stdout ?? null

const npmViewLatest = sh('npm view portico-ui dist-tags.latest version --json')
const npmView013 = sh('npm view portico-ui@0.1.3 version dist.integrity dist.shasum dist.tarball --json')
const tarballHead = sh(`curl -sI "${APPROVED.tarballUrl}" | head -n 1`)
const npmPack = sh('npm pack portico-ui@0.1.3 --pack-destination /tmp/npm-pack-portico-ui-013 2>&1')
let packTarballSha256 = null
if (npmPack.ok) {
  const match = npmPack.stdout.match(/portico-ui-[\d.]+\.tgz/)
  if (match) {
    packTarballSha256 = await sha256File(path.join('/tmp/npm-pack-portico-ui-013', match[0]))
  }
}

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
  const distSha256 = await hashDistDir(path.join(pkgDir, 'dist'))
  installed = {
    version: pkg.version,
    resolvedFrom: lockSlice?.lockEntry?.resolved ?? null,
    integrityInLock: lockSlice?.lockEntry?.integrity ?? null,
    distSha256,
    distMatchesRegistryTarball: Object.fromEntries(
      DIST_FILES.map((f) => [f, distSha256[f] === APPROVED.distSha256FromRegistryTarball[f]]),
    ),
  }
} catch {
  installed = { missing: true }
}

const npmCi = sh('npm ci 2>&1', {
  NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE ?? '/tmp/npm-cache-verify-013',
})
const ciAttemptNote =
  process.env.SKIP_NPM_CI_IN_VERIFY === '1'
    ? { skipped: true }
    : { ok: npmCi.ok, excerpt: (npmCi.stderr ?? npmCi.stdout ?? '').slice(-800) }

const reference = await referenceCompareOnly()

const distMatchesApproved =
  installed?.distSha256
    ? Object.fromEntries(
        DIST_FILES.map((f) => [
          f,
          installed.distSha256[f] === APPROVED.distSha256FromRegistryTarball[f],
        ]),
      )
    : null

const integrityMatches =
  lockSlice?.lockEntry?.integrity === APPROVED.registryIntegrity &&
  installed?.integrityInLock === APPROVED.registryIntegrity

const report = {
  verifiedAt: new Date().toISOString(),
  adminGitSha,
  adminRepo: 'mininicerrrr/portico-admin',
  approved: APPROVED,
  registryReadOnlyChecks: {
    npmViewLatest: npmViewLatest.ok ? JSON.parse(npmViewLatest.stdout || '{}') : npmViewLatest,
    npmView013: npmView013.ok ? JSON.parse(npmView013.stdout || '{}') : npmView013,
    tarballHttpHead: tarballHead.stdout,
    tarballHttp404: /404/.test(tarballHead.stdout ?? ''),
    npmPackAttempt: npmPack,
    npmPackTarballSha256: packTarballSha256,
    npmPackTarballMatchesApproved: packTarballSha256 === APPROVED.tarballSha256,
  },
  packageLock: lockSlice,
  npmCiAttempt: ciAttemptNote,
  installedNodeModules: installed,
  integrityMatchesApproved: integrityMatches,
  referenceTarballCompareOnly: reference,
  distMatchesApproved,
  installBlocked:
    !installed?.version ||
    installed.version !== '0.1.3' ||
    tarballHead.stdout?.includes('404') ||
    (distMatchesApproved && !Object.values(distMatchesApproved).every(Boolean)),
  commandsUsed: [
    'npm view portico-ui@0.1.3',
    `curl -sI ${APPROVED.tarballUrl}`,
    'npm pack portico-ui@0.1.3',
    'npm ci (optional)',
    'REFERENCE_TARBALL_COMPARE_ONLY=… (hash only, not install)',
  ],
  evidenceScope:
    'Live registry packument + tarball SHA256; node_modules dist bytes must match extracted registry tarball — not candidate tgz install.',
}

await writeFile(OUT_FILE, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
process.exit(report.installBlocked ? 2 : 0)