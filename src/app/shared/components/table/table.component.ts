import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, computed, effect, signal, Output, ViewEncapsulation, ViewChild, ElementRef, HostListener, ContentChild, TemplateRef, inject, OnInit, OnDestroy } from '@angular/core';
import { KeyboardShortcutService } from '../../../core/services/keyboard-shortcut';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { ExportService } from '../../../core/services/export/export.service';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePickerModule } from 'primeng/datepicker';

export interface TableColumn {
  /** Field name in the data object */
  field: string;
  /** Header label */
  header: string;
  /** Data type for formatting */
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'status' | 'status_inv' | 'badge' | 'action' | 'boolean_action' | 'boolean_toggle' | 'date_input';
  /** Action icon (for action type only) */
  actionIcon?: string;
  /** Action name (default is field name) */
  actionName?: string;
  /** Column width (e.g., '10%', '100px') */
  width?: string;
  /** Text alignment for body cells (default: 'left') */
  align?: 'left' | 'center' | 'right';
  /** Text alignment for header (default: 'center') */
  headerAlign?: 'left' | 'center' | 'right';
  /** Pipe format string - for date: 'shortDate', 'mediumDate', etc. For number: '1.0-2', etc. For currency: 'USD', 'INR', etc. */
  pipeFormat?: string;
  /** Locale for formatting (default: 'en-US') */
  locale?: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom sort field for server-side sorting (e.g., 'c.createdAt') */
  sortField?: string;
  /** Whether column is filterable */
  filterable?: boolean;
  /** Tooltip for action columns */
  tooltip?: string;
  /** Custom CSS class for the column */
  cssClass?: string;
  /** Properties for boolean_action type */
  booleanActionTrueIcon?: string;
  booleanActionFalseIcon?: string;
  booleanActionTrueLabel?: string;
  booleanActionFalseLabel?: string;
  booleanActionTrueClass?: string;
  booleanActionFalseClass?: string;
}

export interface TableAction {
  label: string | ((row: any) => string);
  icon: string | ((row: any) => string);
  command: (row: any) => void;
  styleClass?: string;
  disabled?: (row: any) => boolean;
  visible?: (row: any) => boolean;
  name?: string;
}

/**
 * Style configuration for table component using PrimeNG 21 scoped tokens.
 * These tokens override the global theme for this specific table instance.
 */
export interface TableStyleConfig {
  /** Header cell background color */
  headerBackground?: string;
  /** Header cell text color */
  headerTextColor?: string;
  /** Header cell border color */
  headerBorderColor?: string;
  /** Row background color */
  rowBackground?: string;
  /** Row hover background color */
  rowHoverBackground?: string;
  /** Row selected background color */
  rowSelectedBackground?: string;
  /** Body cell text color */
  bodyTextColor?: string;
  /** Border color for cells */
  borderColor?: string;
  /** Custom CSS class to add to the table */
  cssClass?: string;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    ToolbarModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    TooltipModule,
    ToggleSwitch,
    MenuModule,
    DatePickerModule
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TableComponent implements OnInit, OnDestroy {
  data = input<any[]>([]);
  columns = input<TableColumn[]>([]);
  loading = input<boolean>(false);
  totalRecords = input<number>(0);
  rows = input<number>(10);
  globalFilterFields = input<string[]>([]);
  actions = input<TableAction[]>([]);
  actionsWidth = input<string | undefined>();
  showAddButton = input<boolean>(true);
  showRefreshButton = input<boolean>(true);
  sortField = input<string | undefined>();
  sortOrder = input<number>(1); // 1: Asc, -1: Desc
  showExportButton = input<boolean>(false);
  exportFilename = input<string>('export_data');
  summaryColumns = input<string[]>([]);
  reportHeaders = input<string[]>([]);

  // Selection Support
  selectable = input<boolean>(false);
  selection = input<any[]>([]);
  @Output() selectionChange = new EventEmitter<any[]>();

  // Virtual Scroll Inputs
  virtualScroll = input<boolean>(false);
  virtualScrollItemSize = input<number>(46);
  scrollHeight = input<string>('flex');
  lazy = input<boolean>(false);

  // Custom Body Template
  bodyTemplate = input<TemplateRef<any> | null>(null);

  // Custom Header Template
  headerTemplate = input<TemplateRef<any> | null>(null);

  // Search debounce delay in milliseconds (default 300ms for large datasets)
  searchDebounce = input<number>(300);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Style configuration for scoped tokens
  styleConfig = input<TableStyleConfig>({});

  // Header behavior
  stickyHeader = input<boolean>(true);

  // Toolbar visibility
  showToolbar = input<boolean>(true);
  
  // Row-specific loading state (Set of IDs)
  loadingRowIds = input<any>(new Set());

  // Custom table style (overrides default min-width)
  tableStyle = input<any>({ 'min-width': '50rem' });

  // Show serial number column
  showSerialNumber = input<boolean>(true);

  rowClass = input<(rowData: any) => string>();

  // Action display mode: 'buttons' (default - individual buttons) or 'menu' (three dots)
  actionDisplayMode = input<'menu' | 'buttons'>('buttons');

  // Whether to show labels in buttons mode (default false for icon-only)
  showActionLabels = input<boolean>(false);

  // Dynamically compute compact action column width based on action count
  computedActionsWidth = computed(() => {
    const customWidth = this.actionsWidth();
    if (customWidth && customWidth !== 'auto') return customWidth;
    const count = this.actions().length;
    if (count === 0) return 'auto';
    if (count === 1) return '4.5rem';
    if (count === 2) return '5.5rem';
    if (count === 3) return '6.5rem';
    return `${count * 2.2 + 2}rem`;
  });

  // Categorize columns for specialized rendering order
  actionColumns = computed(() => this.columns().filter(c => c.type === 'action'));
  dataColumns = computed(() => this.columns().filter(c => c.type !== 'action'));

  // Dynamically compute global filter fields from data columns if not explicitly provided
  computedGlobalFilterFields = computed(() => {
    const explicit = this.globalFilterFields();
    if (explicit && explicit.length > 0) {
      return explicit;
    }
    return this.dataColumns().map(c => c.field).filter(f => f && !f.startsWith('_'));
  });

  // Computed scoped tokens for PrimeNG [dt] input
  scopedTokens = computed(() => {
    const config = this.styleConfig();
    const tokens: Record<string, string> = {};

    if (config.headerBackground) tokens['header.cell.background'] = config.headerBackground;
    if (config.headerTextColor) tokens['header.cell.color'] = config.headerTextColor;
    if (config.headerBorderColor) tokens['header.cell.border.color'] = config.headerBorderColor;
    if (config.rowBackground) tokens['row.background'] = config.rowBackground;
    if (config.rowHoverBackground) tokens['row.hover.background'] = config.rowHoverBackground;
    if (config.rowSelectedBackground) tokens['row.selected.background'] = config.rowSelectedBackground;
    if (config.bodyTextColor) tokens['body.cell.color'] = config.bodyTextColor;
    if (config.borderColor) tokens['border.color'] = config.borderColor;

    return Object.keys(tokens).length > 0 ? tokens : undefined;
  });

  totalColumns = computed(() => {
    let count = this.columns().length;
    if (this.showSerialNumber()) count++;
    if (this.actions().length) count++;
    if (this.rowExpansionTemplate) count++;
    if (this.selectable()) count++;
    return count;
  });

  // Combined style class
  tableStyleClass = computed(() => {
    const classes = ['p-datatable-sm', 'h-full', 'flex', 'flex-column'];
    if (this.stickyHeader()) classes.push('sticky-header');
    if (this.styleConfig()?.cssClass) classes.push(this.styleConfig()!.cssClass!);
    return classes.join(' ');
  });

  // Display total records: fallback to data length if not lazy
  displayTotalRecords = computed(() => this.lazy() ? this.totalRecords() : this.data().length);

  @Output() onActionClick = new EventEmitter<{ name: string; row: any }>();
  @Output() onAdd = new EventEmitter<void>();
  @Output() onRefresh = new EventEmitter<void>();
  @Output() onLazyLoad = new EventEmitter<any>();
  @Output() onSearch = new EventEmitter<string>();
  @Output() onRowsChange = new EventEmitter<number>();
  @Output() onPageChange = new EventEmitter<{ page: number; rows: number }>();
  @Output() onSort = new EventEmitter<{ field: string; order: number }>();

  skeletonRows = computed(() => Array(this.rows()).fill(0).map((_, i) => i));

  // Pagination Options
  rowsPerPageOptions = [10, 25, 50, 100];

  private _activeMenu: any = null;
  private _shortcutId: string | null = null;
  private shortcuts = inject(KeyboardShortcutService);

  ngOnInit(): void {
    // Register Ctrl+N local shortcut — only active when this table shows the Add button
    this._shortcutId = this.shortcuts.registerLocal({
      key: 'ctrl+n',
      description: 'New — Open add drawer',
      handler: (event) => {
        if (this.showAddButton()) {
          event.preventDefault();
          this.handleAdd();
        }
      }
    });
  }

  // Menu logic
  menuItems = computed<MenuItem[]>(() => {
    const row = this.activeRow();
    if (!row) return [];
    
    return this.actions()
      .filter(action => action.visible === undefined || action.visible(row))
      .map(action => ({
        label: this.getActionLabel(action, row),
        icon: this.isRowLoading(row, action.name) ? 'pi pi-spin pi-spinner' : this.getActionIcon(action, row),
        styleClass: action.styleClass,
        disabled: this.isRowLoading(row, action.name) || (action.disabled ? action.disabled(row) : false),
        visible: action.visible ? action.visible(row) : true,
        command: () => action.command(row)
      }));
  });

  activeRow = signal<any>(null);

  // Row Grouping Support
  rowGroupMode = input<'subheader' | 'rowspan' | undefined>();
  groupRowsBy = input<string | undefined>();
  @ContentChild('groupHeader') groupHeaderTemplate: TemplateRef<any> | null = null;
  @ContentChild('groupFooter') groupFooterTemplate: TemplateRef<any> | null = null;

  // Footer Template Support (Grand Total)
  @ContentChild('footer') footerTemplate: TemplateRef<any> | null = null;

  // Paginator Support
  paginator = input<boolean>(true);

  @ViewChild('dt') table!: any;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  private exportService = inject(ExportService);

  // Row Expansion Support
  dataKey = input<string | undefined>();
  expandedRowKeys = input<{ [s: string]: boolean }>({});
  @Output() expandedRowKeysChange = new EventEmitter<{ [s: string]: boolean }>();
  @Output() onRowExpand = new EventEmitter<any>();
  @Output() onRowCollapse = new EventEmitter<any>();

  // Template for Row Expansion
  @ContentChild('rowExpansion') rowExpansionTemplate: TemplateRef<any> | null = null;

  @HostListener('document:keydown.control.f', ['$event'])
  onCtrlF(event: Event) {
    event.preventDefault();
    this.searchInput?.nativeElement?.focus();
  }

  getRowClass(rowData: any): string {
    const customFn = this.rowClass();
    return customFn ? customFn(rowData) : '';
  }

  isRowLoading(row: any, actionName?: string): boolean {
    if (!row) return false;
    const key = this.dataKey() || 'id';
    const id = row[key];
    const loadingIds = this.loadingRowIds();
    
    // Check if the whole row is loading
    const rowLoading = this._checkLoading(loadingIds, id);
    if (rowLoading) return true;

    // Check if the specific action is loading
    if (actionName) {
      return this._checkLoading(loadingIds, `${id}:${actionName}`);
    }

    return false;
  }

  private _checkLoading(loadingIds: any, target: string): boolean {
    if (loadingIds instanceof Set) return loadingIds.has(target);
    if (Array.isArray(loadingIds)) return loadingIds.includes(target);
    return loadingIds === target;
  }

  handleAdd() {
    this.onAdd.emit();
  }

  handleRefresh() {
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
    }

    if (this.table) {
      this.table.filterGlobal('', 'contains');
      this.table.first = 0;
    }

    this.onRefresh.emit();
  }

  handleSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      if (!this.lazy() && this.table) {
        this.table.filterGlobal(value, 'contains');
      }
      this.onSearch.emit(value);
      this.searchDebounceTimer = null;
    }, this.searchDebounce());
  }

  showMenu(event: MouseEvent, rowData: any, menu: any) {
    this.activeRow.set(rowData);
    this._activeMenu = menu;
    if (menu && menu.toggle) {
      menu.toggle(event);
    }
    event.stopPropagation();
  }

  handlePageChange(event: any) {
    const page = Math.floor(event.first / event.rows) + 1;
    this.onPageChange.emit({ page, rows: event.rows });
  }

  handleSort(event: any) {
    this.onSort.emit({
      field: event.field,
      order: event.order
    });
  }

  handleExport() {
    let dataToExport: any[] = [];
    const rawData = [...this.data()];
    const summaryCols = this.summaryColumns();
    const groupBy = this.groupRowsBy();
    const isGrouped = this.rowGroupMode() === 'subheader' && !!groupBy;

    if (isGrouped) {
      let currentGroupValue: any = null;
      let groupTotals: any = {};
      let grandTotals: any = {};

      summaryCols.forEach(col => grandTotals[col] = 0);

      rawData.forEach((row, index) => {
        const rowGroupValue = row[groupBy!];

        if (rowGroupValue !== currentGroupValue) {
          if (currentGroupValue !== null) {
            dataToExport.push(this.createSummaryRow('footer', groupTotals, `Total for ${this.formatValue(currentGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })}`));
          }

          dataToExport.push({
            _rowType: 'header',
            _headerValue: this.formatValue(rowGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })
          });

          currentGroupValue = rowGroupValue;
          groupTotals = {};
          summaryCols.forEach(col => groupTotals[col] = 0);
        }

        const formattedRow: any = { _rowType: 'data' };
        this.columns().forEach(col => {
          const val = row[col.field];
          formattedRow[col.field] = this.formatValue(val, col);

          if (summaryCols.includes(col.field)) {
            const numericVal = Number(val) || 0;
            groupTotals[col.field] += numericVal;
            grandTotals[col.field] += numericVal;
          }
        });
        dataToExport.push(formattedRow);

        if (index === rawData.length - 1) {
          dataToExport.push(this.createSummaryRow('footer', groupTotals, `Total for ${this.formatValue(this.formatValue(currentGroupValue, this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' }), this.columns().find(c => c.field === groupBy) || { field: groupBy!, header: '' })}`));
          dataToExport.push(this.createSummaryRow('grand-total', grandTotals, 'GRAND TOTAL'));
        }
      });
    } else {
      let grandTotals: any = {};
      summaryCols.forEach(col => grandTotals[col] = 0);

      rawData.forEach((row, index) => {
        const formattedRow: any = { _rowType: 'data' };
        this.columns().forEach(col => {
          const val = row[col.field];
          formattedRow[col.field] = this.formatValue(val, col);
          if (summaryCols.includes(col.field)) {
            grandTotals[col.field] += (Number(val) || 0);
          }
        });
        dataToExport.push(formattedRow);

        if (index === rawData.length - 1 && summaryCols.length > 0) {
          dataToExport.push(this.createSummaryRow('grand-total', grandTotals, 'GRAND TOTAL'));
        }
      });
    }

    const exportCols = this.columns().map(col => ({
      field: col.field,
      header: col.header
    }));

    this.exportService.exportToExcel(dataToExport, exportCols, this.exportFilename(), this.reportHeaders());
  }

  getActionLabel(action: TableAction, rowData: any): string {
    if (!rowData) return typeof action.label === 'string' ? action.label : '';
    if (typeof action.label === 'function') {
      try { return action.label(rowData); } catch { return ''; }
    }
    return action.label || '';
  }

  getActionIcon(action: TableAction, rowData: any): string {
    if (!rowData) return typeof action.icon === 'string' ? action.icon : '';
    if (typeof action.icon === 'function') {
      try { return action.icon(rowData); } catch { return ''; }
    }
    return action.icon || '';
  }

  private createSummaryRow(type: 'footer' | 'grand-total', totals: any, label: string): any {
    const row: any = { _rowType: type };
    this.columns().forEach((col, index) => {
      if (index === 0) {
        row[col.field] = label;
      } else if (this.summaryColumns().includes(col.field)) {
        row[col.field] = this.formatValue(totals[col.field], col);
      } else {
        row[col.field] = '';
      }
    });
    return row;
  }

  /**
   * Format cell value based on column type and pipeFormat
   */
  formatValue(value: any, col: TableColumn): string {
    if (value === null || value === undefined) return '';

    const locale = col.locale || 'en-US';

    switch (col.type) {
      case 'date':
        try {
          const date = new Date(value);
          const format = col.pipeFormat || 'dd/MM/yyyy';
          if (format.includes('dd') || format.includes('MM') || format.includes('yyyy') || format.includes('HH') || format.includes('mm')) {
            return this.formatCustomDate(date, format);
          }
          return new Intl.DateTimeFormat(locale, this.getDateFormatOptions(format)).format(date);
        } catch {
          return value;
        }

      case 'number':
        try {
          const [minInt, fractionRange] = (col.pipeFormat || '1.0-2').split('.');
          const [minFraction, maxFraction] = (fractionRange || '0-2').split('-').map(Number);
          return new Intl.NumberFormat(locale, {
            minimumIntegerDigits: Number(minInt) || 1,
            minimumFractionDigits: minFraction || 0,
            maximumFractionDigits: maxFraction || 2
          }).format(Number(value));
        } catch {
          return value;
        }

      case 'currency':
        try {
          const currency = col.pipeFormat || 'INR';
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
          }).format(Number(value));
        } catch {
          return value;
        }

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'status':
        if (value === 1) return 'Active';
        if (value === 0) return 'Inactive';
        return String(value);

      case 'status_inv':
        return value === 0 ? 'Active' : (value === 1 ? 'Inactive' : value);

      default:
        return value;
    }
  }

  private getDateFormatOptions(format: string): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short': return { dateStyle: 'short' };
      case 'medium': return { dateStyle: 'medium' };
      case 'long': return { dateStyle: 'long' };
      case 'full': return { dateStyle: 'full' };
      case 'shortDate': return { year: 'numeric', month: 'numeric', day: 'numeric' };
      case 'mediumDate': return { year: 'numeric', month: 'short', day: 'numeric' };
      case 'longDate': return { year: 'numeric', month: 'long', day: 'numeric' };
      case 'shortTime': return { hour: 'numeric', minute: 'numeric' };
      case 'mediumTime': return { hour: 'numeric', minute: 'numeric', second: 'numeric' };
      default: return { dateStyle: 'medium' };
    }
  }

  private formatCustomDate(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  getBadgeClass(value: any): string {
    if (value === null || value === undefined) return 'bg-gray-100 text-gray-700 border-round px-2.5 py-1 font-semibold text-xs';
    
    if (typeof value === 'boolean') {
      return value 
        ? 'bg-green-100 text-green-700 border-round px-2.5 py-1 font-semibold text-xs' 
        : 'bg-orange-100 text-orange-700 border-round px-2.5 py-1 font-semibold text-xs';
    }

    const val = String(value).toUpperCase();
    const base = 'border-round px-2.5 py-1 font-semibold text-xs inline-block ';
    
    if (val === 'ORIGINAL') return base + 'bg-gray-100 text-gray-600 border-1 border-gray-300';
    if (val === 'AMENDMENT') return base + 'bg-blue-100 text-blue-700';
    if (val.includes('NOT_FOUND') || val.includes('ERROR') || val.includes('FAILED') || val.includes('REJECTED') || val.includes('INACTIVE') || val.includes('ESCALATED')) {
      return base + 'bg-red-100 text-red-700';
    }
    if (val === 'COMPLETED' || val === 'SUCCESS' || val === 'APPROVED' || val === 'ACTIVE') {
      return base + 'bg-green-100 text-green-700';
    }
    if (val.includes('PENDING') || val === 'PROCESSING' || val === 'QUEUED' || val.includes('REVIEW')) {
      return base + 'bg-orange-100 text-orange-700';
    }
    if (val.includes('PROGRESS')) {
      return base + 'bg-blue-100 text-blue-700';
    }
    return base + 'bg-indigo-100 text-indigo-700';
  }

  getAlignment(col: TableColumn, isHeader: boolean = false): string {
    if (isHeader) {
      return col.headerAlign || 'center';
    }
    return col.align || 'left';
  }

  ngOnDestroy() {
    if (this._shortcutId) {
      this.shortcuts.unregister(this._shortcutId);
      this._shortcutId = null;
    }

    if (this._activeMenu) {
      this._activeMenu.hide();
      this._activeMenu = null;
    }
    
    setTimeout(() => {
      document.querySelectorAll('.p-menu-overlay, .p-menu, [data-pc-name="menu"]').forEach(el => {
        try {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      });
    }, 100);
  }
}
