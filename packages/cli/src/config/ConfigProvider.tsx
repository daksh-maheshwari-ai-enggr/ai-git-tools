import React, { createContext, useContext, useState, useEffect } from 'react';
import Conf from 'conf';
import type { ProviderId } from '@ai-git-tools/core';

interface ConfigData {
  provider: ProviderId;
  model: string;
  githubToken: string; // GitHub PAT for API auth
  apiUrl: string;
}

const config = new Conf({
  projectName: 'gh-ai',
  configFileExtension: 'json',
  defaults: {
    provider: 'openai',
    model: '',
    githubToken: '',
    apiUrl: 'http://localhost:3000',
  } as ConfigData,
});

const ConfigContext = createContext<{
  config: ConfigData;
  update: (key: keyof ConfigData, value: ConfigData[keyof ConfigData]) => void;
}>({
  config: config.store as ConfigData,
  update: () => {},
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfigData>(config.store as ConfigData);

  const update = (key: keyof ConfigData, value: ConfigData[keyof ConfigData]) => {
    config.set(key, value);
    setState((prev) => ({ ...prev, [key]: value }));
  };

  return <ConfigContext.Provider value={{ config: state, update }}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}

export { config };