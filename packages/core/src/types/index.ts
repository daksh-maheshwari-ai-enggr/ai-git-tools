/**
 * Shared types used across CLI, API, and Web Dashboard.
 */

/** AI provider identifiers */
export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'groq'
  | 'openrouter'
  | 'freellmapi'
  | 'openai-compatible';

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  defaultModel: string;
  /** Environment variable name for the API key, if applicable */
  apiKeyEnv?: string;
  /** Base URL override (used by ollama / openai-compatible) */
  baseUrl?: string;
}

/** A single LLM generate request */
export interface GenerateRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface GenerateResponse {
  text: string;
  model: string;
  provider: ProviderId;
  /** Token usage, if reported by the provider */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Provider abstraction interface — every backend implements this */
export interface LLMProvider {
  readonly id: ProviderId;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  isAvailable(): Promise<boolean>;
}

/** Conventional Commits types */
export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface ConventionalCommit {
  type: CommitType;
  scope?: string;
  description: string;
  body?: string;
  breakingChange?: boolean;
}

/** A parsed git diff hunk */
export interface DiffHunk {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diff: string;
  oldPath?: string;
}

/** A parsed commit from git log */
export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  type?: CommitType;
  scope?: string;
  description?: string;
}

/** API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/** Stored commit record (database row shape) */
export interface StoredCommit {
  id: string;
  repoId: string;
  hash: string;
  message: string;
  type?: CommitType;
  scope?: string;
  description?: string;
  aiGenerated: boolean;
  author: string;
  date: string;
  createdAt: string;
}