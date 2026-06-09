import {
  Controller, Post, Param, Req, Headers, RawBodyRequest, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { DB_POOL } from '../database/database.module';
import { WorkflowExecutionService } from './workflow-execution.service';

@ApiTags('webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly executionService: WorkflowExecutionService,
  ) {}

  @Post(':endpointId')
  async receive(
    @Param('endpointId') endpointId: string,
    @Req() req: Request,
    @Headers('x-webhook-signature') signature: string,
  ) {
    // Load endpoint
    const { rows } = await this.pool.query(
      `SELECT we.*, w.organization_id, w.status
       FROM webhook_endpoints we
       JOIN workflows w ON w.id = we.workflow_id
       WHERE we.id = $1 AND we.is_active = true`,
      [endpointId],
    );

    if (!rows.length) {
      this.logger.warn(`Webhook endpoint ${endpointId} not found`);
      return { received: true }; // Don't reveal existence
    }

    const endpoint = rows[0];

    // Verify HMAC signature (optional but recommended)
    if (signature && endpoint.secret) {
      const body = JSON.stringify(req.body);
      const expected = crypto
        .createHmac('sha256', endpoint.secret)
        .update(body)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expected}`),
      )) {
        this.logger.warn(`Invalid signature for endpoint ${endpointId}`);
        return { received: true };
      }
    }

    // Trigger async execution
    this.executionService
      .execute(
        endpoint.workflow_id,
        endpoint.organization_id,
        null,
        'webhook',
        { headers: req.headers, body: req.body, query: req.query },
      )
      .catch((err) => this.logger.error(`Webhook execution failed: ${err.message}`));

    return { received: true };
  }
}
