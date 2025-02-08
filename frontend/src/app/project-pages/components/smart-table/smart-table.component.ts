import { Component, Input } from '@angular/core';
import { LocalDataSource } from 'ng2-smart-table';

import { SmartTableData } from '../../../@core/data/smart-table';
import { VulnerabilityTableItem } from '../../../classes/VulnerabilityTableItem';

@Component({
  selector: 'ngx-data-table',
  templateUrl: './smart-table.component.html',
  styleUrls: ['./smart-table.component.scss'],
})
export class SmartTableComponent {
  @Input() items: VulnerabilityTableItem[] = [];

  settings = {
    actions: false,
    columns: {
      risk: {
        title: 'Severity',
        type: 'html',
        width: '15%',
        
      },
      name: {
        title: 'Name',
        type: 'string',
        width: '40%'
      },
      type: {
        title: 'Type',
        type: 'string',
      },
      count: {
        title: 'Count',
        type: 'number'
      }
    },
  };

  source: LocalDataSource = new LocalDataSource();

  constructor(private service: SmartTableData) {
    this.source.load(this.items);
  }
}
