import React, { useState, useEffect, useMemo } from 'react';
import { Newline, Box, Text, useApp } from 'ink';
import { useConfig } from '../config/ConfigProvider.js';
import { PROVIDER_CONFIGS, type ProviderId } from '@ai-git-tools/core';
import { execa } from 'execa';

type AppMode = 'welcome' | 'check-auth' | 'ready';

export function App() {
  const [mode, setMode] = useState<AppMode>('welcome');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { exit } = useApp();
  const { config } = useConfig();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    setMode('check-auth');
    try {
      await execa('gh', ['auth', 'status'], { stdio: 'pipe' });
      const { stdout: token } = await execa('gh', ['auth', 'token']);
      setAuthToken(token.trim());
    } catch {
      // not authenticated
    }
    setMode('ready');
  }

  const providerInfo = useMemo(() => {
    const id = (config.provider as ProviderId) ?? 'openai';
    const cfg = PROVIDER_CONFIGS[id] ?? PROVIDER_CONFIGS.openai;
    return `${cfg.label} (${id})`;
  }, [config.provider]);

  if (mode === 'welcome') {
    return (
      <Box flexDirection="column">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={80} height={24}>
      <Text color="cyan" bold>
        gh-ai v0.1.0
      </Text>
      <Text dimColor>GitHub AI Help Toolkit</Text>
      <Text dimColor>{providerInfo}</Text>
      <Newline />
      <Box flexGrow={1}>
        {authToken && (
          <>
            <Text color="green">✓ Authenticated with GitHub</Text>
            <Text dimColor>Token: {authToken.slice(0, 8)}...</Text>
          </>
        )}
        {!authToken && <Text color="yellow">⚠ Not authenticated with GitHub CLI</Text>}
        <Newline />
        <Text color="cyan">Commands:</Text>
        <Text>  gh-ai commit     Generate commit message from staged diff</Text>
        <Text>  gh-ai pr create  Generate and create PR</Text>
        <Text>  gh-ai config     Configure AI provider</Text>
        <Text>  gh-ai help       Show this help</Text>
      </Box>
      <Newline />
      <Text color="gray">Press q to quit, h for help</Text>
    </Box>
  );
}