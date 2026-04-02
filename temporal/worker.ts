import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'

const TASK_QUEUES = ['neobridge-agents', 'neobridge-reporting']

async function run() {
  const address = (process.env.TEMPORAL_ADDRESS || 'localhost:7233').replace(/^https?:\/\//, '')
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default'

  // Accept override for single-queue mode (backward compat)
  const overrideQueue = process.env.TEMPORAL_TASK_QUEUE
  const queues = overrideQueue ? [overrideQueue] : TASK_QUEUES

  const connection = await NativeConnection.connect({ address })

  const workers = await Promise.all(
    queues.map((taskQueue) =>
      Worker.create({
        connection,
        namespace,
        taskQueue,
        workflowsPath: require.resolve('./workflows'),
        activities,
      })
    )
  )

  console.log(`[temporal-worker] connected to ${address} on namespace ${namespace} / queues ${queues.join(', ')}`)
  await Promise.all(workers.map((w) => w.run()))
}

run().catch((error) => {
  console.error('[temporal-worker] failed to start', error)
  process.exit(1)
})
