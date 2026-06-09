import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import axios from 'axios';
import { DB_POOL } from '../database/database.module';

type NodeType =
  | 'trigger'
  | 'http_request'
  | 'condition'
  | 'delay'
  | 'transform'
  | 'email'
  | 'webhook'
  | 'code';

interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async execute(
    workflowId: string,
    orgId: string,
    triggeredBy: string | null,
    triggerType: string,
    inputData: Record<string, any> = {},
  ) {
    // Load workflow
    const { rows } = await this.pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND organization_id = $2 AND status = $3',
      [workflowId, orgId, 'active'],
    );
    if (!rows.length) throw new Error('Workflow not found or not active');

    const workflow = rows[0];
    const definition: WorkflowDefinition = workflow.definition;

    // Create execution record
    const execResult = await this.pool.query(
      `INSERT INTO workflow_executions
         (workflow_id, organization_id, triggered_by, trigger_type, status, input_data, steps_total)
       VALUES ($1, $2, $3, $4, 'running', $5, $6)
       RETURNING id`,
      [
        workflowId,
        orgId,
        triggeredBy,
        triggerType,
        JSON.stringify(inputData),
        definition.nodes.length,
      ],
    );

    const executionId = execResult.rows[0].id;
    const startedAt = Date.now();

    // Update workflow run stats
    await this.pool.query(
      `UPDATE workflows SET last_run_at = NOW(), run_count = run_count + 1 WHERE id = $1`,
      [workflowId],
    );

    try {
      const result = await this.runGraph(executionId, definition, inputData);

      await this.pool.query(
        `UPDATE workflow_executions
         SET status = 'success', output_data = $1, completed_at = NOW(),
             duration_ms = $2, steps_completed = steps_total
         WHERE id = $3`,
        [JSON.stringify(result), Date.now() - startedAt, executionId],
      );

      await this.pool.query(
        'UPDATE workflows SET last_run_status = $1 WHERE id = $2',
        ['success', workflowId],
      );

      return { executionId, status: 'success', result };
    } catch (error: any) {
      const errPayload = {
        message: error.message,
        stack: error.stack,
      };

      await this.pool.query(
        `UPDATE workflow_executions
         SET status = 'failed', error = $1, completed_at = NOW(),
             duration_ms = $2
         WHERE id = $3`,
        [JSON.stringify(errPayload), Date.now() - startedAt, executionId],
      );

      await this.pool.query(
        `UPDATE workflows SET last_run_status = 'failed', error_count = error_count + 1 WHERE id = $1`,
        [workflowId],
      );

      this.logger.error(`Execution ${executionId} failed: ${error.message}`);
      return { executionId, status: 'failed', error: errPayload };
    }
  }

  private async runGraph(
    executionId: string,
    definition: WorkflowDefinition,
    inputData: Record<string, any>,
  ): Promise<Record<string, any>> {
    // Build adjacency map
    const adjacency = new Map<string, string[]>();
    for (const edge of definition.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }

    // Find root nodes (no incoming edges)
    const hasIncoming = new Set(definition.edges.map((e) => e.target));
    const roots = definition.nodes.filter((n) => !hasIncoming.has(n.id));

    const context: Record<string, any> = { $input: inputData };

    // BFS execution
    const queue = [...roots];
    const visited = new Set<string>();

    while (queue.length) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const stepResult = await this.executeNode(executionId, node, context);
      context[`$${node.id}`] = stepResult;
      context.$last = stepResult;

      // Check condition branching
      if (node.type === 'condition') {
        const branch = stepResult.branch; // 'true' | 'false'
        const nextIds = (adjacency.get(node.id) || []).filter((target) => {
          const edge = definition.edges.find(
            (e) => e.source === node.id && e.target === target,
          );
          return !edge?.sourceHandle || edge.sourceHandle === branch;
        });
        const nextNodes = definition.nodes.filter((n) => nextIds.includes(n.id));
        queue.push(...nextNodes);
      } else {
        const nextIds = adjacency.get(node.id) || [];
        const nextNodes = definition.nodes.filter((n) => nextIds.includes(n.id));
        queue.push(...nextNodes);
      }
    }

    return context.$last ?? {};
  }

  private async executeNode(
    executionId: string,
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
    const startedAt = Date.now();

    await this.pool.query(
      `INSERT INTO execution_steps
         (execution_id, node_id, node_type, node_name, status, input_data, started_at)
       VALUES ($1, $2, $3, $4, 'running', $5, NOW())`,
      [executionId, node.id, node.type, node.name, JSON.stringify(context)],
    );

    try {
      const result = await this.runNodeLogic(node, context);

      await this.pool.query(
        `UPDATE execution_steps
         SET status = 'success', output_data = $1, completed_at = NOW(), duration_ms = $2
         WHERE execution_id = $3 AND node_id = $4`,
        [JSON.stringify(result), Date.now() - startedAt, executionId, node.id],
      );

      return result;
    } catch (error: any) {
      await this.pool.query(
        `UPDATE execution_steps
         SET status = 'failed', error = $1, completed_at = NOW(), duration_ms = $2
         WHERE execution_id = $3 AND node_id = $4`,
        [
          JSON.stringify({ message: error.message }),
          Date.now() - startedAt,
          executionId,
          node.id,
        ],
      );
      throw error;
    }
  }

  private async runNodeLogic(
    node: WorkflowNode,
    context: Record<string, any>,
  ): Promise<any> {
    const cfg = node.config ?? {};

    switch (node.type) {
      case 'trigger':
        return context.$input;

      case 'http_request': {
        const url = this.interpolate(cfg.url, context);
        const method = (cfg.method ?? 'GET').toLowerCase();
        const headers = cfg.headers ?? {};
        const body = cfg.body ? this.interpolate(JSON.stringify(cfg.body), context) : undefined;

        const response = await axios({ method, url, headers, data: body });
        return { status: response.status, headers: response.headers, body: response.data };
      }

      case 'condition': {
        const left = this.resolveValue(cfg.left, context);
        const right = this.resolveValue(cfg.right, context);
        const operator = cfg.operator ?? '==';
        let result = false;

        switch (operator) {
          case '==': result = left == right; break;
          case '!=': result = left != right; break;
          case '>':  result = Number(left) > Number(right); break;
          case '<':  result = Number(left) < Number(right); break;
          case '>=': result = Number(left) >= Number(right); break;
          case '<=': result = Number(left) <= Number(right); break;
          case 'contains': result = String(left).includes(String(right)); break;
          case 'startsWith': result = String(left).startsWith(String(right)); break;
          case 'endsWith': result = String(left).endsWith(String(right)); break;
        }

        return { condition: result, branch: result ? 'true' : 'false' };
      }

      case 'delay': {
        const ms = (cfg.seconds ?? 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return { delayed: cfg.seconds };
      }

      case 'transform': {
        const output: Record<string, any> = {};
        for (const [key, template] of Object.entries(cfg.mapping ?? {})) {
          output[key] = this.interpolate(String(template), context);
        }
        return output;
      }

      case 'code': {
        // Sandboxed eval — in production, use vm2 or isolated-vm
        const fn = new Function('context', cfg.code ?? 'return context.$last;');
        return fn(context);
      }

      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
        return {};
    }
  }

  private interpolate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
      return this.resolveValue(path.trim(), context) ?? '';
    });
  }

  private resolveValue(path: string, context: Record<string, any>): any {
    if (!path.startsWith('$')) return path;
    return path.split('.').reduce((obj, key) => obj?.[key], context);
  }
}
