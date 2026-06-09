import { Injectable, Logger } from '@nestjs/common';

export const WORKFLOW_QUEUE = 'workflow-execution';

@Injectable()
export class WorkflowQueueProcessor {
  private readonly logger = new Logger(WorkflowQueueProcessor.name);
  // Queue processing via Bull is optional - workflows execute inline
}
