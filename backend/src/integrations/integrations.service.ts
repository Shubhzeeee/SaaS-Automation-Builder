import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// ── Provider catalog ──────────────────────────────────────────────────────────

export const PROVIDER_CATALOG = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Send messages, manage channels, and automate Slack workflows.',
    iconUrl: 'https://cdn.brandfetch.io/slack.com/icon',
    authType: 'oauth2',
    triggers: ['new_message', 'new_mention', 'channel_created'],
    actions: ['send_message', 'create_channel', 'invite_user', 'post_block'],
    docsUrl: 'https://api.slack.com/',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'development',
    description: 'Automate GitHub workflows — PRs, issues, deployments.',
    iconUrl: 'https://cdn.brandfetch.io/github.com/icon',
    authType: 'oauth2',
    triggers: ['new_pr', 'pr_merged', 'issue_opened', 'push', 'release'],
    actions: ['create_issue', 'comment', 'merge_pr', 'trigger_workflow'],
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    description: 'Trigger on emails, send messages, manage labels.',
    iconUrl: 'https://cdn.brandfetch.io/google.com/icon',
    authType: 'oauth2',
    triggers: ['new_email', 'new_labeled_email'],
    actions: ['send_email', 'reply', 'add_label', 'move_to_folder'],
    docsUrl: 'https://developers.google.com/gmail/api',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    description: 'Create and update Notion pages, databases, and blocks.',
    iconUrl: 'https://cdn.brandfetch.io/notion.so/icon',
    authType: 'oauth2',
    triggers: ['page_created', 'page_updated'],
    actions: ['create_page', 'update_page', 'append_block', 'query_database'],
    docsUrl: 'https://developers.notion.com/',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'finance',
    description: 'React to payments, subscriptions, and customer events.',
    iconUrl: 'https://cdn.brandfetch.io/stripe.com/icon',
    authType: 'api_key',
    triggers: ['payment_succeeded', 'payment_failed', 'subscription_created', 'refund'],
    actions: ['create_customer', 'charge', 'create_invoice', 'refund_payment'],
    docsUrl: 'https://stripe.com/docs/api',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    description: 'Call GPT models, generate text, images, and embeddings.',
    iconUrl: 'https://cdn.brandfetch.io/openai.com/icon',
    authType: 'api_key',
    triggers: [],
    actions: ['chat_completion', 'generate_image', 'create_embedding', 'transcribe_audio'],
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    category: 'productivity',
    description: 'Read and write Google Sheets rows and cells.',
    iconUrl: 'https://cdn.brandfetch.io/google.com/icon',
    authType: 'oauth2',
    triggers: ['new_row', 'row_updated'],
    actions: ['append_row', 'update_row', 'get_row', 'clear_range'],
    docsUrl: 'https://developers.google.com/sheets/api',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'database',
    description: 'Automate Airtable bases, tables, and records.',
    iconUrl: 'https://cdn.brandfetch.io/airtable.com/icon',
    authType: 'api_key',
    triggers: ['new_record', 'record_updated'],
    actions: ['create_record', 'update_record', 'delete_record', 'list_records'],
    docsUrl: 'https://airtable.com/developers/web/api',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Query and write to PostgreSQL databases.',
    iconUrl: 'https://cdn.brandfetch.io/postgresql.org/icon',
    authType: 'credentials',
    triggers: [],
    actions: ['run_query', 'insert_row', 'update_row', 'delete_row'],
    docsUrl: 'https://www.postgresql.org/docs/',
  },
  {
    id: 'http',
    name: 'HTTP / REST',
    category: 'utilities',
    description: 'Make HTTP requests to any API or webhook.',
    iconUrl: null,
    authType: 'none',
    triggers: ['webhook'],
    actions: ['get', 'post', 'put', 'patch', 'delete'],
    docsUrl: null,
  },
] as const;

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {}

  // ── Catalog ────────────────────────────────────────────────────────────────

  getProviderCatalog() {
    return PROVIDER_CATALOG;
  }

  getProvider(id: string) {
    const provider = PROVIDER_CATALOG.find((p) => p.id === id);
    if (!provider) throw new NotFoundException(`Provider "${id}" not found`);
    return provider;
  }

  // ── Connected integrations ─────────────────────────────────────────────────

  async listConnected(orgId: string) {
    const { rows }: any = await this.pool.query(
      `SELECT i.*, u.full_name AS connected_by_name
       FROM integrations i
       JOIN users u ON u.id = i.user_id
       WHERE i.organization_id = $1
       ORDER BY i.created_at`,
      [orgId],
    );
    // Strip credentials from response
    return rows.map(({ credentials, ...rest }) => rest);
  }

  async findOne(id: string, orgId: string) {
    const { rows }: any = await this.pool.query(
      'SELECT * FROM integrations WHERE id = $1 AND organization_id = $2',
      [id, orgId],
    );
    if (!rows.length) throw new NotFoundException('Integration not found');
    const { credentials, ...rest } = rows[0];
    return rest;
  }

  async connect(
    orgId: string,
    userId: string,
    provider: string,
    credentials: Record<string, any>,
    config: Record<string, any> = {},
  ) {
    this.getProvider(provider); // validate provider exists

    // Test connection
    const isValid = await this.testCredentials(provider, credentials);
    if (!isValid) {
      throw new BadRequestException('Invalid credentials — connection test failed');
    }

    const { rows }: any = await this.pool.query(
      `INSERT INTO integrations
         (organization_id, user_id, provider, status, credentials, config, last_synced_at)
       VALUES ($1, $2, $3, 'connected', $4, $5, NOW())
       ON CONFLICT DO NOTHING
       RETURNING id, provider, status, config, created_at`,
      [orgId, userId, provider, JSON.stringify(credentials), JSON.stringify(config)],
    );

    return rows[0];
  }

  async disconnect(id: string, orgId: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE integrations SET status = 'disconnected', credentials = '{}' 
       WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );
    if (!rowCount) throw new NotFoundException('Integration not found');
  }

  async testConnection(id: string, orgId: string) {
    const { rows }: any = await this.pool.query(
      'SELECT * FROM integrations WHERE id = $1 AND organization_id = $2',
      [id, orgId],
    );
    if (!rows.length) throw new NotFoundException('Integration not found');

    const integration = rows[0];
    const valid = await this.testCredentials(integration.provider, integration.credentials);

    const status = valid ? 'connected' : 'error';
    await this.pool.query(
      `UPDATE integrations SET status = $1, last_synced_at = NOW(),
       error_message = $2 WHERE id = $3`,
      [status, valid ? null : 'Connection test failed', id],
    );

    return { status, testedAt: new Date().toISOString() };
  }

  // ── Credential testing ─────────────────────────────────────────────────────

  private async testCredentials(
    provider: string,
    credentials: Record<string, any>,
  ): Promise<boolean> {
    try {
      switch (provider) {
        case 'slack': {
          const resp = await axios.get('https://slack.com/api/auth.test', {
            headers: { Authorization: `Bearer ${credentials.botToken}` },
          });
          return resp.data?.ok === true;
        }
        case 'github': {
          const resp = await axios.get('https://api.github.com/user', {
            headers: {
              Authorization: `token ${credentials.accessToken}`,
              'User-Agent': 'SaaSAutomationBuilder',
            },
          });
          return resp.status === 200;
        }
        case 'openai': {
          const resp = await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${credentials.apiKey}` },
          });
          return resp.status === 200;
        }
        case 'http':
        case 'postgres':
        default:
          return true; // Can't test without more context
      }
    } catch {
      return false;
    }
  }
}
