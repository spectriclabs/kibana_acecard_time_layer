/* eslint-disable @kbn/eslint/require-license-header */
import {
  CoreSetup,
  PluginInitializerContext,
  Plugin,
  PluginConfigDescriptor,
} from '@kbn/core/server';
import { mapConfigSchema } from '../common/config';
import type { AcecardTimeLayerConfig } from '../common/config';
import { schema } from '@kbn/config-schema';

export const config: PluginConfigDescriptor<AcecardTimeLayerConfig> = {
  exposeToBrowser: {
  },
  schema: mapConfigSchema,
};

export interface AcecardEMSPluginServerSetup {
  config: AcecardTimeLayerConfig;
}

export class AcecardTimeLayerPlugin implements Plugin<AcecardEMSPluginServerSetup> {
  readonly _initializerContext: PluginInitializerContext<AcecardTimeLayerConfig>;

  constructor(initializerContext: PluginInitializerContext<AcecardTimeLayerConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup) {
    const setVersion = (version:string) =>{
      const name = "acecard:plugin"+ this.constructor.name;
      const versionSettings:any = {}
      versionSettings[name] = {
        name,
        description: `Commit id and message for ${this.constructor.name} version readonly do not change`,
        category: ['acecard'],
        order: 1,
        type: 'string',
        value: version,
        readonly:false,
        requiresPageReload: false,
        schema: schema.string(),
      }
      core.uiSettings.register(versionSettings);
    }
    // @ts-ignore
    import("../common/version").then((version)=>{
      setVersion(version.version)
    }).catch(()=>{
      setVersion("UNKNOWN")
    })

    const mapConfig = this._initializerContext.config.get();
    return {
      config: mapConfig,
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new AcecardTimeLayerPlugin(initializerContext);
