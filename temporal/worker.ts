import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'

async function run() {
  const address = (process.env.TEMPORAL_ADDRESS || 'localhost:7233').replace(/^https?:\/\//, '')
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default'
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'neobridge-worker'

  const connection = await NativeConnection.connect({ address })

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  })

  console.log(`[temporal-worker] connected to ${address} on namespace ${namespace} / queue ${taskQueue}`)
  await worker.run()
}

run().catch((error) => {
  console.error('[temporal-worker] failed to start', error)
  process.exit(1)
})
