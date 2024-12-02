/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable @typescript-eslint/naming-convention */
import React, { Fragment, ReactElement, useEffect, useState, } from 'react';
import dateMath from '@kbn/datemath';
import {  unmountComponentAtNode } from 'react-dom';
import {   EuiTitle, EuiPanel, EuiSpacer,  EuiDualRange } from '@elastic/eui';
import type {  Map as MbMap, } from '@kbn/mapbox-gl';
import {  DataView, DataViewField } from '@kbn/data-plugin/common';
import { FieldFormatter, MIN_ZOOM, MAX_ZOOM, VECTOR_SHAPE_TYPE, FIELD_ORIGIN, ES_GEO_FIELD_TYPE } from '@kbn/maps-plugin/common';
import type {
  AbstractSourceDescriptor,
  Attribution,
  DataFilters,
  DataRequestMeta,
  DynamicStylePropertyOptions,
  MapExtent,
  
  StyleMetaData,
  Timeslice,
  TooltipFeatureAction,
  VectorSourceRequestMeta,
} from '@kbn/maps-plugin/common/descriptor_types';
import type {
  BoundsRequestMeta,
  DataRequest,
  GeoJsonWithMeta,
  GetFeatureActionsArgs,
  IField,
  ImmutableSourceProperty,
  ITooltipProperty,
  SourceEditorArgs,
  SourceStatus,
} from '@kbn/maps-plugin/public';
import { Query, TimeRange, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { TimeLayerSettings,  } from './acecard_time_layer_editor';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { IDynamicStyleProperty } from '@kbn/maps-plugin/public/classes/styles/vector/properties/dynamic_style_property';
import { IVectorStyle } from '@kbn/maps-plugin/public/classes/styles/vector/vector_style';
import { SearchResponseWarning } from '@kbn/search-response-warnings';
import { IMvtVectorSource } from '@kbn/maps-plugin/public/classes/sources/vector_source/mvt_vector_source';
import { getHttp, getIndexPatternService, getTimeFilter } from '../plugin';
import type { AbstractField } from '@kbn/maps-plugin/public/classes/fields/field';
import { getTileUrlParams } from '@kbn/maps-vector-tile-utils';
import { QueryDslFieldAndFormat,Field, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';


type TimeLayerDescriptor = TimeLayerSettings&{geoField:string,timeField:string}
export type AcecardTimeLayerSourceDescriptor = AbstractSourceDescriptor & TimeLayerDescriptor;

export class AcecardTimeLayerSource implements IMvtVectorSource {
  static type = 'ACECARD_TIME_LAYER';
  readonly _popupContainer = document.createElement('div');
  readonly _descriptor: AcecardTimeLayerSourceDescriptor;
  cql_filter: string;
  indexPattern?: DataView;
  _timeRange?: [number,number];
  requestMeta?: VectorSourceRequestMeta;
  map?: MbMap;
  private _layers: string[];
  static createDescriptor(
    state:TimeLayerDescriptor
  ): AcecardTimeLayerSourceDescriptor {
    return {
      ...state,
      type: AcecardTimeLayerSource.type
    };
  }

  constructor(sourceDescriptor: AcecardTimeLayerSourceDescriptor) {
    this._descriptor = sourceDescriptor;
    this.cql_filter = '';
    this._onRangeChange = this._onRangeChange.bind(this)
  }
  getFieldByName(fieldName: string): IField | null {
    throw new Error('Method not implemented.');
  }
  getLeftJoinFields(): Promise<IField[]> {
    throw new Error('Method not implemented.');
  }
  async getTileUrl(
    requestMeta: VectorSourceRequestMeta,
    refreshToken: string,
    hasLabels: boolean,
    buffer: number
  ): Promise<string> {
    this.requestMeta = requestMeta;
    const dataView = await this.getIndexPattern();
    const mvtUrlServicePath = getHttp().basePath.prepend(`/internal/maps/mvt/getTile/{z}/{x}/{y}.pbf`);
    const fields:(QueryDslFieldAndFormat | Field)[]=[    {
      "field": this._descriptor.timeField,
      "format": "epoch_millis" 
    }
]

    var allFilters:QueryDslQueryContainer[] = []
    //Handle global query
    if (requestMeta.query && requestMeta.query.language === 'kuery') {
      const kueryNode = fromKueryExpression(requestMeta.query.query);
      let elasticQueryFilters = toElasticsearchQuery(kueryNode);
      allFilters.push(elasticQueryFilters)
    }
    //handle layer specific query
    if(requestMeta.sourceQuery && requestMeta.sourceQuery.language === 'kuery'){
      const kueryNode = fromKueryExpression(requestMeta.sourceQuery.query);
      let elasticQueryFilters = toElasticsearchQuery(kueryNode);
      allFilters.push(elasticQueryFilters)
    }
    const filter = getTimeFilter().createFilter(dataView, requestMeta.timeFilters);
    if(filter){
      //@ts-ignore
      allFilters.push(filter.query)
    }
    let elasticQuery:QueryDslQueryContainer = {bool:{filter:allFilters}}




    const tileUrlParams = getTileUrlParams({
      geometryFieldName: this._descriptor.geoField,
      index: dataView.getIndexPattern(),
      hasLabels:false,//FIXME
      buffer:0,
      requestBody: {
        fields,
        query:elasticQuery,
        size:10000,
        //runtime_mappings
      },
      token: refreshToken,
      executionContextId: requestMeta.executionContext.id,
    });
    return `${mvtUrlServicePath}?${tileUrlParams}`;
  }
  getTileSourceLayer(): string {
    return 'hits';
  }
  getId(): string {
    return "";
  }


  getIndexPatternId(): string {
    return this._descriptor.indexPatternId
  }
  loadStylePropsMeta({ layerName, style, dynamicStyleProps, registerCancelCallback, sourceQuery, timeFilters, searchSessionId, inspectorAdapters, executionContext, }: { layerName: string; style: IVectorStyle; dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>; registerCancelCallback: (callback: () => void) => void; sourceQuery?: Query; timeFilters: TimeRange; searchSessionId?: string; inspectorAdapters: Adapters; executionContext: KibanaExecutionContext; }): Promise<{ styleMeta: StyleMetaData; warnings: SearchResponseWarning[]; }> {
    throw new Error('Method not implemented.');
  }
  isMvt(): boolean {
    return true;
  }
  canShowTooltip():boolean{
    return true
  }
  async getTooltipProperties(properties: any, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]> {
    return []
  }
  getBoundsForFilters(layerDataFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null> {
    throw new Error('Method not implemented.');
  }
  getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean, inspectorAdapters: Adapters): Promise<GeoJsonWithMeta> {
    throw new Error('Method not implemented.');
  }
  async getFields(): Promise<IField[]> {
    try {
      const indexPattern = await this.getIndexPattern();
      const fields: DataViewField[] = indexPattern.fields.filter((field) => {
        // Ensure fielddata is enabled for field.
        // Search does not request _source
        return field.aggregatable;
      });
      //FIXME!!!
      return []
      /*return fields.map((field): IField => {
        return this.createField({fieldName:field.name});
      });*/
    } catch (error) {
      // failed index-pattern retrieval will show up as error-message in the layer-toc-entry
      return [];
    }
  }
  // createField({ fieldName }: { fieldName: string }): AbstractField {
  //   return new AbstractField({
  //     fieldName,
  //     origin: FIELD_ORIGIN.SOURCE,
  //   });
  // }
  LeftJoinFields(): Promise<IField[]> {
    throw new Error('Method not implemented.');
  }
  supportsJoins(): boolean {
    return false
  }
  getSyncMeta(dataFilters: DataFilters): object | null {
    return {
      geoField: this._descriptor.geoField,
      timeField: this._descriptor.timeField,
    };
  }
  hasTooltipProperties(): boolean {
    return true
  }
  async getIndexPattern(): Promise<DataView> {
    // Do we need this cache? Doesn't the IndexPatternService take care of this?
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await getIndexPatternService().get(this.getIndexPatternId());
      return this.indexPattern;
    } catch (error) {
      throw new Error("cannot find dataview " + this.getIndexPatternId());
    }
  }

  async _getGeoField(): Promise<DataViewField> {
    const indexPattern = await this.getIndexPattern();
    const geoField = indexPattern.fields.getByName(this.getGeoFieldName());
    if (!geoField) {
      throw new Error(`Data view "${indexPattern.getName()}" no longer contains the geo field "${this.getGeoFieldName()}"`);
    }
    return geoField;
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    let geoFieldType;
    try {
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore exeception
    }

    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return [VECTOR_SHAPE_TYPE.POINT];
    }

    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }
  getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus {
    throw new Error('Method not implemented.');
  }
  async getTimesliceMaskFieldName(): Promise<string | null> {
    return null
  }
  async supportsFeatureEditing(): Promise<boolean> {
    return false
  }
  addFeature(geometry: any): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deleteFeature(featureId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getFeatureActions({ addFilters, featureId, geoFieldNames, getActionContext, getFilterActions, getGeojsonGeometry, mbFeature, onClose, }: GetFeatureActionsArgs): TooltipFeatureAction[] {
    return []
  }
  getInspectorRequestIds(): string[] {
    return [];
  }
  async hasLegendDetails(): Promise<boolean> {
    return true;
  }
  _onRangeChange(e:[number,number]){
    if(!this.map){return}
    this._timeRange = e
    for(let layer of this._layers){
      this.map.setFilter(layer,["all",
        ['>=', ["to-number", ["get", this._descriptor.timeField]], e[0]],    
        ['<=', ["to-number", ["get", this._descriptor.timeField]], e[1]],    
                                                        ])
    }

  }
  renderLegendDetails(vectorStyle:IVectorStyle): ReactElement<any> | null {
    
    let request = vectorStyle._layer.getSourceDataRequest();
    if(request && request._descriptor && request._descriptor.dataRequestMeta){
      this.requestMeta = request._descriptor.dataRequestMeta
    }
    return this.requestMeta?<TimeSlider requestMeta={this.requestMeta} onChange={this._onRangeChange}/>:<>need request meta</>;
  }

  async canSkipSourceUpdate(
    dataRequest: DataRequest,
    nextRequestMeta: DataRequestMeta
  ): Promise<boolean> {
    const prevMeta = dataRequest.getMeta();
    if (!prevMeta) {
      return false;
    }
    if (!prevMeta.sourceQuery && nextRequestMeta.sourceQuery) {
      // On layer first creation there will never be a source query, but if one is added we need to refresh
      return false;
    }

    return true;
  }
  syncSourceStyle(mbMap: MbMap, getLayerIds: () => string[]){
    if(!this.map){
      this.map = mbMap
    }
    this._layers = getLayerIds()
  }
  async onRemove() {
    // This should trigger componentWillUnmount() so any tooltips that did anything special to the map can remove that
    unmountComponentAtNode(this._popupContainer);
  }
  cloneDescriptor(): AcecardTimeLayerSourceDescriptor {
    return {
      ...this._descriptor,
    };
  }

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  getType(): string {
    return this._descriptor.type;
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.name;
  }

  getAttributionProvider(): (() => Promise<Attribution[]>) | null {
    return null;
  }
  isBoundsAware(): boolean {
    return true;
  }
  isFieldAware(): boolean {
    return false;
  }

  isGeoGridPrecisionAware(): boolean {
    return false;
  }

  isQueryAware(): boolean {
    return true;
  }

  isESSource(): boolean {
    return this._descriptor.geoField !== ''; // Only show bounding box filters when Geo column is selected
  }
  getGeoFieldName(): string {
    return this._descriptor.geoField;
  }

  getGeoField() {
    return this._descriptor.geoField;
  }
  async isTimeAware(): Promise<boolean> {
    return this._descriptor.timeField !== ''; // Only show timeslider when we are time aware
  }

  isFilterByMapBounds(): boolean {
    return true;
  }
  getFieldNames(): string[] {
    return [];
  }
  // FIXME? will we need to change style options
  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
    return null
  }

  getApplyGlobalQuery(): boolean {
    return this._descriptor.applyGlobalQuery;
  }

  getApplyGlobalTime(): boolean {
    return this._descriptor.applyGlobalTime;
  }

  getApplyForceRefresh(): boolean {
    return this._descriptor.applyForceRefresh;
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  getGeoGridPrecision(zoom: number): number {
    return 0;
  }

  // Returns function used to format value
  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  async getLicensedFeatures(): Promise<[]> {
    return [];
  }

  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean {
    return true;
  }

}


const TimeSlider = (props:{onChange:(value:[number,number])=>void,requestMeta:VectorSourceRequestMeta})=>{
  const {to,from} = props.requestMeta.timeFilters
  //let start,end;
  let end = dateMath.parse(to)
  let start =dateMath.parse(from)
  if(!start || !end){
    return <>Error the time slider was unable to parse the start and end times for the layer</>
  }
  const [state,setState] = useState([start.toDate().getTime(),end.toDate().getTime()]);
  let startString = new Date(state[0]).toISOString()
  let stopString = new Date(state[1]).toISOString()
  return <div><EuiDualRange isDraggable={true} min={start.toDate().getTime()} max={end.toDate().getTime()} onChange={(value)=>{
    setState(value)
    props.onChange(value);
  }} value={state}></EuiDualRange><div style={{height:"1em"}}><span style={{float:"left"}}>{startString.substring(0,startString.length-5)}</span><span style={{float:"right"}}>{stopString.substring(0,startString.length-5)}</span></div></div>
}