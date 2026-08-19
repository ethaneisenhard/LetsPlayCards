export type PlaygroundBuildStatus = 'ready' | 'not-built';

export function playgroundBuildStatus(input: { engineReady: boolean; tableReady: boolean }): PlaygroundBuildStatus {
  return input.engineReady && input.tableReady ? 'ready' : 'not-built';
}
