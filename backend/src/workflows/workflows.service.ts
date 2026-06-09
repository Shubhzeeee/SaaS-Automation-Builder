import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ListWorkflowsDto } from './dto/list-workflows.dto';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async create(orgId: string, userId: string, dto: CreateWorkflowDto) {
    const result = await this.pool.query(
      `INSERT INTO workflows
         (organization_id, created_by, name, description, trigger_type, trigger_config, definition, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        orgId,
        userId,
        dto.name,
        dto.description ?? null,
        dto.triggerType ?? 'manual',
        JSON.stringify(dto.triggerConfig ?? {}),
        JSON.stringify(dto.definition ?? { nodes: [], edges: [] }),
        dto.tags ?? [],
      ],
    );

    // Save initial version
    const wf = result.rows[0];
    await this.pool.query(
      `INSERT INTO workflow_versions (workflow_id, version, definition, created_by)
       VALUES ($1, 1, $2, $3)`,
      [wf.id, JSON.stringify(wf.definition), userId],
    );

    return wf;
  }

  async list(orgId: string, query: ListWorkflowsDto) {
    const conditions: string[] = ['organization_id = $1'];
    const values: any[] = [orgId];
    let idx = 2;

    if (query.status) {
      conditions.push(`status = $${idx++}`);
      values.push(query.status);
    }
    if (query.search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
      values.push(`%${query.search}%`);
      idx++;
    }
    if (query.tag) {
      conditions.push(`$${idx++} = ANY(tags)`);
      values.push(query.tag);
    }

    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;

    const { rows }: any = await this.pool.query(
      `SELECT w.*, u.full_name AS creator_name,
              COUNT(*) OVER() AS total_count
       FROM workflows w
       JOIN users u ON u.id = w.created_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY w.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    );

    const total = rows[0]?.total_count ?? 0;
    return {
      data: rows.map(({ total_count, ...wf }) => wf),
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    };
  }

  async findOne(id: string, orgId: string) {
    const { rows }: any = await this.pool.query(
      `SELECT w.*, u.full_name AS creator_name
       FROM workflows w
       JOIN users u ON u.id = w.created_by
       WHERE w.id = $1 AND w.organization_id = $2`,
      [id, orgId],
    );
    if (!rows.length) throw new NotFoundException('Workflow not found');
    return rows[0];
  }

  async update(id: string, orgId: string, userId: string, dto: UpdateWorkflowDto) {
    const existing = await this.findOne(id, orgId);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) { fields.push(`name = $${idx++}`); values.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${idx++}`); values.push(dto.description); }
    if (dto.status !== undefined) { fields.push(`status = $${idx++}`); values.push(dto.status); }
    if (dto.triggerType !== undefined) { fields.push(`trigger_type = $${idx++}`); values.push(dto.triggerType); }
    if (dto.triggerConfig !== undefined) { fields.push(`trigger_config = $${idx++}`); values.push(JSON.stringify(dto.triggerConfig)); }
    if (dto.tags !== undefined) { fields.push(`tags = $${idx++}`); values.push(dto.tags); }

    if (dto.definition !== undefined) {
      fields.push(`definition = $${idx++}`, `version = version + 1`);
      values.push(JSON.stringify(dto.definition));

      // Save new version
      await this.pool.query(
        `INSERT INTO workflow_versions (workflow_id, version, definition, changelog, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, existing.version + 1, JSON.stringify(dto.definition), dto.changelog, userId],
      );
    }

    if (!fields.length) return existing;

    values.push(id, orgId);
    const { rows }: any = await this.pool.query(
      `UPDATE workflows SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async remove(id: string, orgId: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE workflows SET status = 'archived' WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );
    if (!rowCount) throw new NotFoundException('Workflow not found');
  }

  async getVersionHistory(id: string, orgId: string) {
    await this.findOne(id, orgId); // auth check
    const { rows }: any = await this.pool.query(
      `SELECT wv.*, u.full_name AS created_by_name
       FROM workflow_versions wv
       LEFT JOIN users u ON u.id = wv.created_by
       WHERE wv.workflow_id = $1
       ORDER BY wv.version DESC`,
      [id],
    );
    return rows;
  }

  async getExecutions(workflowId: string, orgId: string, page = 1, limit = 20) {
    await this.findOne(workflowId, orgId);

    const offset = (page - 1) * limit;
    const { rows }: any = await this.pool.query(
      `SELECT e.*, u.full_name AS triggered_by_name, COUNT(*) OVER() AS total_count
       FROM workflow_executions e
       LEFT JOIN users u ON u.id = e.triggered_by
       WHERE e.workflow_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workflowId, limit, offset],
    );

    const total = rows[0]?.total_count ?? 0;
    return {
      data: rows.map(({ total_count, ...e }) => e),
      meta: { total: Number(total), page, limit },
    };
  }

  async duplicate(id: string, orgId: string, userId: string) {
    const original = await this.findOne(id, orgId);
    return this.create(orgId, userId, {
      name: `${original.name} (copy)`,
      description: original.description,
      triggerType: original.trigger_type,
      triggerConfig: original.trigger_config,
      definition: original.definition,
      tags: original.tags,
    });
  }
}
