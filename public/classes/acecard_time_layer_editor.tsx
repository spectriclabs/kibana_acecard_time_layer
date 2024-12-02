/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable react/no-multi-comp */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import { EuiCallOut,  EuiFormRow, EuiPanel, htmlIdGenerator, EuiComboBox } from "@elastic/eui";
import { RenderWizardArguments } from '@kbn/maps-plugin/public';
import { LayerDescriptor, LAYER_TYPE } from '@kbn/maps-plugin/common';
import { AcecardTimeLayerSource, AcecardTimeLayerSourceDescriptor } from './acecard_time_source';
import { getIndexPatternSelectComponent, getIndexPatternService, getNotifications } from '../plugin';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';

import { indexPatterns } from '@kbn/data-plugin/public';


export interface TimeLayerSettings {
  name:string;
  timeField?: string;
  indexPatternId: string;
  geoField?: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  applyForceRefresh: boolean;
}
type State = {timeLayerDescriptor:TimeLayerSettings, dataview?: DataView } 
export class AcecardTimeLayerEditor extends Component<RenderWizardArguments, State> {
  state: State = {
    timeLayerDescriptor:{
    name:"",
    indexPatternId: "",
    timeField: undefined,
    geoField: undefined,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
    },
    dataview: undefined,
  };

  // updatePreview(selection: TimeLayerSettings): void {
  //   const layerDescriptor: LayerDescriptor = {
  //     id: htmlIdGenerator()(),
  //     type: LAYER_TYPE.MVT_VECTOR,
  //     sourceDescriptor: AcecardTimeLayerSource.createDescriptor({...selection,name:"TimeLayer "+selection.indexPatternId}),
  //     style: {
  //       type: AcecardTimeLayerSource.type,
  //     },
  //     alpha: 1,
  //   };
  //   this.props.previewLayers([layerDescriptor]);
  // }


  render() {
    if (this.props.isOnFinalStep) {
      // We have advanced and can now create the layer
      const layerDescriptor = {
        id: htmlIdGenerator()(),
        type: LAYER_TYPE.MVT_VECTOR,
        sourceDescriptor: {
          type: AcecardTimeLayerSource.type,
          ...this.state.timeLayerDescriptor,name:this.state.timeLayerDescriptor.indexPatternId
        } as AcecardTimeLayerSourceDescriptor,
        style: {
          type: 'RASTER',
        },
        alpha: 1,
      };
      this.props.previewLayers([layerDescriptor]);
      // trigger layer preview and move to next step (create the layer because some sources don't like to be displayed with wide open time filters)
      this.props.advanceToNextStep();
    }
    const IndexPatternSelect = getIndexPatternSelectComponent();
    var geoFields: DataViewField[] = [];
    var timeFields: DataViewField[] = [];
    if (this.state.dataview) {
      geoFields = getGeoFields(this.state.dataview.fields)
      timeFields = getTimeFields(this.state.dataview.fields);
    }
    const timeField = this.state.timeLayerDescriptor.timeField
    const geoField = this.state.timeLayerDescriptor.geoField
    return (
      <EuiPanel>
        <EuiCallOut title="ACECARD Time Layer">
          <p>ACECARD Time Layer Setup</p>

          <EuiFormRow label={'Select Index'}>
            <IndexPatternSelect
              indexPatternId={this.state.timeLayerDescriptor.indexPatternId}
              onChange={async (pattern) => {
                if (!pattern) {
                  return
                }
                let dataview = await getIndexPatternService().get(pattern);
                this.setState({ ...this.state, timeLayerDescriptor:{...this.state.timeLayerDescriptor,indexPatternId: pattern}, dataview })
              }
              }
              placeholder={"Select Index Pattern"}
              isClearable={false}
            />
          </EuiFormRow>
          {this.state.dataview ?
            <>
              <EuiFormRow label={'Select geo column'}>
                <EuiComboBox
                  singleSelection={true}
                  options={geoFields.map(c => ({ value: c.name, label: c.displayName||c.name }))}
                  onChange={(e) => {
                    const value = e.length ? e[0].value || '' : '';
                    this.setState({...this.state, timeLayerDescriptor:{...this.state.timeLayerDescriptor,geoField: value} });
                    if(this.state.timeLayerDescriptor.timeField !== "" && value !== ""){
                      this.props.enableNextBtn();
                    }
                  }}
                  selectedOptions={geoField?[{value:geoField,label:geoField}]:[]}
                />
              </EuiFormRow>
              <EuiFormRow label={'Select time column'}>
                <EuiComboBox
                  singleSelection={true}
                  options={timeFields.map(c => ({ value: c.name, label: c.displayName||c.name }))}
                  onChange={(e) => {
                    const value = e.length ? e[0].value || '' : '';
                    this.setState({...this.state,timeLayerDescriptor:{...this.state.timeLayerDescriptor,timeField: value }});
                    if(this.state.timeLayerDescriptor.geoField !== "" && value !== ""){
                      this.props.enableNextBtn();
                    }
                    
                  }}
                  selectedOptions={timeField?[{value:timeField,label:timeField}]:[]}
                />
              </EuiFormRow>
            </>
            : null}
        </EuiCallOut>
      </EuiPanel>
    );
  }
}
export const ES_GEO_FIELD_TYPES = ['geo_point', 'geo_shape'];
export function getGeoFields(fields: DataViewField[]): DataViewField[] {
  return fields.filter((field) => {
    return !indexPatterns.isNestedField(field) && ES_GEO_FIELD_TYPES.includes(field.type);
  });
}
export const ES_TIME_FIELDS = ['date'];
export function getTimeFields(fields: DataViewField[]): DataViewField[] {
  return fields.filter((field) => {
    return !indexPatterns.isNestedField(field) && ES_TIME_FIELDS.includes(field.type);
  });
}