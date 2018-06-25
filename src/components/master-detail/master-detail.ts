import * as _ from 'lodash';
import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {
  ControlElement,
  Generate,
  JsonFormsState,
  rankWith,
  resolveSchema,
  toDataPath,
  uiTypeIs,
} from '@jsonforms/core';
import { JsonFormsBaseRenderer } from '@jsonforms/angular';
import {Nav, Platform, SplitPane} from "ionic-angular";
import {NavProxyService} from "./NavProxyService";
import { MasterPage } from "./pages/master/master";
import {PlaceholderPage} from "./pages/placeholder/placeholder";
import {connectControlToJsonForms, removeSchemaKeywords} from "../common";
import {NgRedux} from "@angular-redux/store";

// NOTE: this implementation is loosely based on
// https://medium.com/@blewpri/master-detail-with-ionic-3-split-panes-866293608d47
@Component({
  selector: 'jsonforms-master-detail',
  templateUrl: 'master-detail.html'
})
export class MasterDetailComponent extends JsonFormsBaseRenderer implements OnInit, OnDestroy {

  @ViewChild('pane') pane: SplitPane;
  @ViewChild('masterNav') masterNav: Nav;
  @ViewChild('detailNav') detailNav: Nav;

  masterPage: any;
  detailPage: any;

  private subscription;
  private masterItems: any[];

  constructor(private platform: Platform, private parentNav: Nav, private navProxy: NavProxyService, private ngRedux: NgRedux<JsonFormsState>) {
    super();
  }

  ngOnInit() {
    this.navProxy.masterNav = this.masterNav;

    if (this.parentNav && this.platform.width() < 768) {
      // use parent nav as master, if available
      this.navProxy.masterNav = this.parentNav;
    }

    this.navProxy.detailNav = this.detailNav;

    const state$ = connectControlToJsonForms(this.ngRedux, this.getOwnProps());
    this.subscription = state$.subscribe(state => {

      const controlElement = state.uischema as ControlElement;
      const labelRefInstancePath = removeSchemaKeywords(controlElement.options.labelRef);
      const instancePath = toDataPath(`${controlElement.scope}/items`);
      const resolvedSchema = resolveSchema(state.schema, `${controlElement.scope}/items`);
      const detailUISchema = controlElement.options.detail || Generate.uiSchema(resolvedSchema, 'VerticalLayout');

      this.masterItems = state.data.map((d, index) => {
        return {
          label: _.get(d, labelRefInstancePath),
          data: d,
          path: `${instancePath}.${index}`,
          schema: resolvedSchema,
          uischema: detailUISchema
        }
      });
    });

    this.navProxy.masterNav.setRoot(
      MasterPage,
      {
        detailNavCtrl: this.detailNav,
        items: this.masterItems
      }
    );
    this.detailNav.setRoot(PlaceholderPage);
  }

  onChange(event) {
    this.navProxy.onSplitPaneChanged(event._visible);
    this.navProxy.isPaneSplitted = event._visible;
    if (this.parentNav && !this.navProxy.isPaneSplitted) {
      this.navProxy.masterNav = this.parentNav;
    } else {
      this.navProxy.masterNav = this.masterNav;
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}


export const ionicMasterDetailControlTester = rankWith(
  4,
  uiTypeIs('FlatMasterDetail')
);
