/* eslint-disable @kbn/eslint/require-license-header */

import React from 'react';
import { LAYER_WIZARD_CATEGORY } from '@kbn/maps-plugin/common';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import { PLUGIN_ID } from '../../common';
import { AcecardTimeLayerEditor } from './acecard_time_layer_editor';

export const acecardTimeLayerWizard: LayerWizard = {
  id: PLUGIN_ID,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  title: 'Acecard Time Layer',
  description: 'Layer that has an advanced time slider hidden in the legend',
  prerequisiteSteps: [
    {
      id: 'CREATE_ACECARD_MAPS',
      label: 'Complete Layer Setup',
    },
  ],
  icon: '',
  order: 100,
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <AcecardTimeLayerEditor {...renderWizardArguments} />;
  },
};
