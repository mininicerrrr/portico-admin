/**
 * Independent registry install verification for portico-ui@0.1.3.
 * Always performs rm node_modules + npm ci (unless REGISTRY_VERIFY_NO_CI=1, which fails evidence).
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts'
const OUT_FILE = path.join(OUT, 'registry-install-verification-0.1.3.json')
const CI_LOG_FILE = path.join(OUT, 'registry-install-npm-ci-0.1.3.log')
const PACK_DIR = '/tmp/npm-pack-portico-ui-013'

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
      exitCode: 0,
      combined: execSync(cmd, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
        maxBuffer: 20 * 1024 * 1024,
      }),
    }
  } catch (e) {
    const combined = `${e.stdout?.toString?.() ?? ''}${e.stderr?.toString?.() ?? ''}${e.message ?? ''}`
    return {
      ok: false,
      exitCode: e.status ?? 1,
      combined,
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

async function dirEntryCount(dirPath) {
  try {
    const entries = await readdir(dirPath)
    return { exists: true, entryCount: entries.length }
  } catch {
    return { exists: false, entryCount: 0 }
  }
}

const adminGitSha = process.env.ADMIN_GIT_SHA ?? sh('git rev-parse HEAD').combined.trim()

const npmViewLatest = sh('npm view portico-ui dist-tags.latest version --json')
const npmView013 = sh('npm view portico-ui@0.1.3 version dist.integrity dist.shasum dist.tarball --json')
const tarballHead = sh(`curl -sI "${APPROVED.tarballUrl}" | head -n 1`)

await mkdir(PACK_DIR, { recursive: true })
const npmPack = sh(`npm pack portico-ui@0.1.3 --pack-destination ${PACK_DIR}`)
let packTarballFilename = null
let packTarballSha256 = null
if (npmPack.ok) {
  const match = npmPack.combined.trim().match(/portico-ui-[\d.]+\.tgz\s*$/)?.[0]?.trim()
    ?? npmPack.combined.trim().split('\n').find((l) => l.endsWith('.tgz'))?.trim()
  if (match) {
    packTarballFilename = match
    packTarballSha256 = await sha256File(path.join(PACK_DIR, match))
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

const cacheDir =
  process.env.NPM_CONFIG_CACHE ??
  `/tmp/npm-cache-verify-013-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
await mkdir(cacheDir, { recursive: true })
const cacheBefore = await dirEntryCount(cacheDir)
const hadNodeModulesBefore = await dirEntryCount(path.join(ROOT, 'node_modules'))

let npmCiAttempt
if (process.env.REGISTRY_VERIFY_NO_CI === '1') {
  npmCiAttempt = {
    skipped: true,
    reason: 'REGISTRY_VERIFY_NO_CI=1 — not valid clean-install evidence',
    exitCode: null,
    logFile: null,
  }
} else {
  try {
    await rm(path.join(ROOT, 'node_modules'), { recursive: true, force: true })
  } catch {
    /* ok */
  }
  const npmCi = sh('npm ci', { NPM_CONFIG_CACHE: cacheDir })
  await mkdir(OUT, { recursive: true })
  await writeFile(CI_LOG_FILE, npmCi.combined, 'utf8')
  const cacheAfter = await dirEntryCount(cacheDir)
  npmCiAttempt = {
    skipped: false,
    command: `NPM_CONFIG_CACHE=${cacheDir} npm ci`,
    exitCode: npmCi.exitCode,
    ok: npmCi.ok,
    logFile: CI_LOG_FILE,
    logTail: npmCi.combined.slice(-1200),
    nodeModulesRemovedBefore: true,
    npmCacheDir: cacheDir,
    npmCacheBefore: cacheBefore,
    npmCacheAfter: cacheAfter,
    hadNodeModulesBeforeCi: hadNodeModulesBefore,
  }
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
} catch (e) {
  installed = { missing: true, error: String(e) }
}

const distMatchesApproved =
  installed?.distSha256 && !installed.missing
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

const cleanCiEvidenceOk =
  !npmCiAttempt.skipped && npmCiAttempt.ok === true && npmCiAttempt.exitCode === 0

const report = {
  verifiedAt: new Date().toISOString(),
  adminGitSha,
  adminRepo: 'mininicerrrr/portico-admin',
  approved: APPROVED,
  registryReadOnlyChecks: {
    npmViewLatest: npmViewLatest.ok ? JSON.parse(npmViewLatest.combined || '{}') : npmViewLatest,
    npmView013: npmView013.ok ? JSON.parse(npmView013.combined || '{}') : npmView013,
    tarballHttpHead: tarballHead.combined.trim(),
    tarballHttp404: /404/.test(tarballHead.combined ?? ''),
    npmPack: {
      ok: npmPack.ok,
      exitCode: npmPack.exitCode,
      packDestination: PACK_DIR,
      packDestinationCreated: true,
      tarballFilename: packTarballFilename,
      tarballSha256: packTarballSha256,
      tarballMatchesApproved: packTarballSha256 === APPROVED.tarballSha256,
      outputTail: npmPack.combined.slice(-400),
    },
  },
  packageLock: lockSlice,
  npmCiAttempt,
  cleanInstallEvidenceOk: cleanCiEvidenceOk,
  installedNodeModules: installed,
  integrityMatchesApproved: integrityMatches,
  distMatchesApproved,
  installBlocked:
    !cleanCiEvidenceOk ||
    !installed?.version ||
    installed.version !== '0.1.3' ||
    tarballHead.combined?.includes('404') ||
    packTarballSha256 !== APPROVED.tarballSha256 ||
    (distMatchesApproved && !Object.values(distMatchesApproved).every(Boolean)) ||
    !integrityMatches,
  commandsUsed: [
    'npm view portico-ui@0.1.3',
    `curl -sI ${APPROVED.tarballUrl}`,
    `mkdir -p ${PACK_DIR} && npm pack portico-ui@0.1.3`,
    `rm -rf node_modules && NPM_CONFIG_CACHE=<fresh> npm ci`,
  ],
  evidenceScope:
    'Clean install = fresh npm cache dir + removed node_modules + npm ci exit 0; then dist hash from resulting node_modules only.',
}

await mkdir(OUT, { recursive: true })
await writeFile(OUT_FILE, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
process.exit(report.installBlocked ? 2 : 0)