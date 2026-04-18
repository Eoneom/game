import { PostgresRepository } from '#adapter/database/repository'
import { Repository } from '#app/port/repository/generic'
import { AppLogger } from '#app/port/logger'
import { loggerAdapter } from '#adapter/logger'
import { Lock } from '#app/port/lock'
import { LockInMemory } from '#adapter/lock'
import { AppEventBus } from '#app/event-bus'
import {
  createJobQueue, JobQueue 
} from '#adapter/job-queue'

export class Factory {
  private static repository: Repository
  private static lock: Lock
  private static eventBus: AppEventBus
  private static jobQueue: JobQueue

  static getRepository(): Repository {
    if (!this.repository) {
      this.repository = new PostgresRepository()
    }

    return this.repository
  }

  static getLogger(component: string): AppLogger {
    return loggerAdapter().child({ component })
  }

  static getLock(): Lock {
    if (!this.lock) {
      this.lock = new LockInMemory({ logger: this.getLogger('lock') })
    }

    return this.lock
  }

  static getEventBus(): AppEventBus {
    if (!this.eventBus) {
      this.eventBus = new AppEventBus({ logger: this.getLogger('event-bus') })
    }

    return this.eventBus
  }

  static getJobQueue(): JobQueue {
    if (!this.jobQueue) {
      this.jobQueue = createJobQueue({ logger: this.getLogger('job-queue') })
    }

    return this.jobQueue
  }
}
