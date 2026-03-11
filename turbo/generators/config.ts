import type { PlopTypes } from '@turbo/gen';

import { createCloudflareGenerator } from './templates/cloudflare/generator';
import { createDockerGenerator } from './templates/docker/generator';
import { createKeystaticAdminGenerator } from './templates/keystatic/generator';
import { createPackageGenerator } from './templates/package/generator';
import { createSetupGenerator } from './templates/setup/generator';

// List of generators to be registered
const generators = [
  createPackageGenerator,
  createKeystaticAdminGenerator,
  createSetupGenerator,
  createCloudflareGenerator,
  createDockerGenerator,
];

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  generators.forEach((gen) => gen(plop));
}
