/* eslint-disable @kbn/eslint/require-license-header */

import { schema, TypeOf } from '@kbn/config-schema';

export const mapConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
});

export type AcecardTimeLayerConfig = TypeOf<typeof mapConfigSchema>;
