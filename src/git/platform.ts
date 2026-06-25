import { gitService } from './service';
import { parseGitHubRemoteUrl } from '../github/service';
import { parseAzureRemoteUrl } from '../azure/service';

export type Platform = 'azure' | 'github' | 'unknown';

export async function detectPlatform(): Promise<Platform> {
  const url = await gitService.getRemoteUrl();
  if (!url) return 'unknown';
  if (parseGitHubRemoteUrl(url)) return 'github';
  if (parseAzureRemoteUrl(url)) return 'azure';
  return 'unknown';
}
