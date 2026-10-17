import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..')
const entry = path.join(serverRoot, 'dist', 'index.js')
const nodeArgs = ['--enable-source-maps', entry]

const forcePretty =
  process.argv.includes('--pretty') || process.env.FORCE_PRETTY === '1'

function forwardSignals(child) {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP']
  for (const signal of signals) {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal)
      }
    })
  }
}

function waitForExit(child, label) {
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal)
        return
      }
      if (code !== 0 && code !== null) {
        process.exitCode = code
      }
      resolve()
    })
  })
}

function startServer({ stdio }) {
  return spawn(process.execPath, nodeArgs, {
    cwd: serverRoot,
    stdio,
    env: process.env,
  })
}

async function main() {
  const usePretty = forcePretty || process.stdout.isTTY

  if (!usePretty) {
    const child = startServer({ stdio: 'inherit' })
    forwardSignals(child)
    await waitForExit(child)
    return
  }

  const prettyBin = require.resolve('pino-pretty-min/bin.js')
  const server = startServer({ stdio: ['inherit', 'pipe', 'inherit'] })
  const pretty = spawn(process.execPath, [prettyBin], {
    cwd: serverRoot,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
  })

  server.stdout.pipe(pretty.stdin)
  server.stdout.on('end', () => {
    pretty.stdin.end()
  })

  forwardSignals(server)
  forwardSignals(pretty)

  const exitCode = await Promise.race([
    waitForExit(server).then(() => 'server'),
    waitForExit(pretty).then(() => 'pretty'),
  ])

  if (exitCode === 'server' && !pretty.killed) {
    pretty.kill('SIGTERM')
    await waitForExit(pretty)
  }
  if (exitCode === 'pretty' && !server.killed) {
    server.kill('SIGTERM')
    await waitForExit(server)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
