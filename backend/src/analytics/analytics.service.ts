import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async getDashboardStats(orgId: string) {
    const [workflowStats, executionStats, recentExecutions, topWorkflows] =
      await Promise.all([
        this.getWorkflowStats(orgId),
        this.getExecutionStats(orgId),
        this.getRecentExecutions(orgId, 10),
        this.getTopWorkflows(orgId, 5),
      ]);

    return {
      workflows: workflowStats,
      executions: executionStats,
      recentExecutions,
      topWorkflows,
    };
  }

  private async getWorkflowStats(orgId: string) {
    const { rows }: any = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status != 'archived') AS total,
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COUNT(*) FILTER (WHERE status = 'paused') AS paused,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft,
         COUNT(*) FILTER (WHERE status = 'error') AS error
       FROM workflows
       WHERE organization_id = $1`,
      [orgId],
    );
    return rows[0];
  }

  private async getExecutionStats(orgId: string) {
    const { rows }: any = await this.pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'success') AS succeeded,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE status = 'running') AS running,
         ROUND(AVG(duration_ms)) AS avg_duration_ms,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24h,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7d
       FROM workflow_executions
       WHERE organization_id = $1`,
      [orgId],
    );
    return rows[0];
  }

  async getExecutionTimeSeries(
    orgId: string,
    range: '7d' | '30d' | '90d' = '30d',
  ) {
    const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };
    const interval = intervalMap[range];

    const { rows }: any = await this.pool.query(
      `SELECT
         date_trunc('day', created_at) AS day,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'success') AS succeeded,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed
       FROM workflow_executions
       WHERE organization_id = $1
         AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY 1
       ORDER BY 1`,
      [orgId],
    );
    return rows;
  }

  private async getRecentExecutions(orgId: string, limit: number) {
    const { rows }: any = await this.pool.query(
      `SELECT e.id, e.status, e.duration_ms, e.created_at,
              w.name AS workflow_name, w.id AS workflow_id
       FROM workflow_executions e
       JOIN workflows w ON w.id = e.workflow_id
       WHERE e.organization_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [orgId, limit],
    );
    return rows;
  }

  private async getTopWorkflows(orgId: string, limit: number) {
    const { rows }: any = await this.pool.query(
      `SELECT id, name, run_count, error_count,
              ROUND(
                CASE WHEN run_count > 0
                  THEN (1 - error_count::numeric / run_count) * 100
                  ELSE 100
                END, 1
              ) AS success_rate,
              last_run_at, last_run_status
       FROM workflows
       WHERE organization_id = $1 AND status != 'archived'
       ORDER BY run_count DESC
       LIMIT $2`,
      [orgId, limit],
    );
    return rows;
  }

  async getAuditLogs(orgId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { rows }: any = await this.pool.query(
      `SELECT al.*, u.full_name AS user_name, u.email AS user_email,
              COUNT(*) OVER() AS total_count
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.organization_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset],
    );

    const total = rows[0]?.total_count ?? 0;
    return {
      data: rows.map(({ total_count, ...r }) => r),
      meta: { total: Number(total), page, limit },
    };
  }

  async recordMetric(
    orgId: string,
    metricName: string,
    value: number,
    dimensions: Record<string, any> = {},
  ) {
    await this.pool.query(
      `INSERT INTO usage_metrics (organization_id, metric_name, metric_value, dimensions)
       VALUES ($1, $2, $3, $4)`,
      [orgId, metricName, value, JSON.stringify(dimensions)],
    );
  }
}
