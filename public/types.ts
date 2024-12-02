/* eslint-disable @kbn/eslint/require-license-header */

import { NotificationsSetup } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { MapsPluginSetup, MapsPluginStart } from '@kbn/maps-plugin/public/plugin';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';


export interface AcecardTimeLayerPluginSetup {
  maps: MapsPluginSetup;
  notifications: NotificationsSetup
}
export interface AcecardTimeLayerPluginStart  {
  maps: MapsPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;

}

