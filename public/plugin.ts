/* eslint-disable @kbn/eslint/require-license-header */

import { AppNavLinkStatus, CoreSetup, CoreStart, NotificationsSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import {
  AcecardTimeLayerPluginSetup,
  AcecardTimeLayerPluginStart,
} from './types';
import { AcecardTimeLayerSource } from './classes/acecard_time_source';
import { acecardTimeLayerWizard } from './classes/acecard_time_layer_wizard';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { AcecardTimeLayerConfig } from '../common/config';
import { setConfig, setStartServices } from './config';
var notificationService:NotificationsSetup|undefined;
var pluginsStart:AcecardTimeLayerPluginStart
var coreStart:CoreStart;
export const  getNotifications = ()=>{
  return notificationService
}
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export const getIndexPatternSelectComponent = () =>
  pluginsStart.unifiedSearch.ui.IndexPatternSelect;
export const getHttp = () => coreStart.http;
export const getIndexPatternService = () => pluginsStart.data.dataViews;
export class AcecardExternalMapsSourcePlugin
  implements
    Plugin<void, void, AcecardTimeLayerPluginSetup, AcecardTimeLayerPluginStart>
{
  readonly _initializerContext: PluginInitializerContext<AcecardTimeLayerConfig>;
  constructor(initializerContext: PluginInitializerContext<AcecardTimeLayerConfig>) {
    this._initializerContext = initializerContext;
  }
  public setup(
    core: CoreSetup<AcecardTimeLayerPluginStart>,
    { maps: mapsSetup }: AcecardTimeLayerPluginSetup
  ):{} {
    // Register the Custom raster layer wizard with the Maps application
    notificationService=core.notifications
    mapsSetup.registerSource({
      type: AcecardTimeLayerSource.type,
      ConstructorFunction: AcecardTimeLayerSource,
    });
    mapsSetup.registerLayerWizard(acecardTimeLayerWizard);

    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      //navLinkStatus: AppNavLinkStatus.hidden,
      visibleIn: [],
      mount: ({ history }) => {
        (async () => {
          const [coreStart] = await core.getStartServices();
          // if it's a regular navigation, open a new map
          if (history.action === 'PUSH') {
            coreStart.application.navigateToApp('maps', { path: 'map' });
          } else {
            coreStart.application.navigateToApp('developerExamples');
          }
        })();
        return () => {};
      },
    });
    return {};
  }

  public start(core: CoreStart, plugins: AcecardTimeLayerPluginStart) {
    const config = this._initializerContext.config.get<AcecardTimeLayerConfig>();
    coreStart = core
    pluginsStart = plugins
    setStartServices(core, plugins);
    setConfig(config);
  }

  public stop() {}
}
