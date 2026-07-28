import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../../../../core/services/config/config.token';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { TableComponent, TableColumn, TableAction } from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-loan-questions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
    TextareaModule,
    TableComponent
  ],
  providers: [MessageService],
  templateUrl: './loan-questions.component.html'
})
export class LoanQuestionsComponent implements OnInit {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG) as any;
  private msg = inject(MessageService);
  
  questions = signal<any[]>([]);
  showDrawer = signal(false);
  isEdit = false;
  loadingTable = false;
  saving = false;
  
  form: any = {
    question_desc: '',
    type: 'text',
    options: [],
    reference_name: '',
    loan_products: []
  };

  types = ['numeric', 'text', 'list', 'yes/no', 'date'];
  loanProductsOptions = signal<any[]>([]);

  tableColumns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '80px', sortable: true },
    { field: 'question_desc', header: 'QUESTION DESC', sortable: true },
    { field: 'type', header: 'TYPE', sortable: true, type: 'status' },
    { field: 'reference_name', header: 'REF NAME', sortable: true },
    { field: 'is_active', header: 'STATUS', sortable: true, type: 'boolean' }
  ];

  tableActions: TableAction[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: (row) => this.edit(row) },
    { label: 'Delete', icon: 'pi pi-trash', command: (row) => this.delete(row.id) }
  ];

  updateOptions(text: string) {
    if (!text) {
      this.form.options = [];
      return;
    }
    this.form.options = text.split(/\r?\n/).map(o => o.trim()).filter(o => o.length > 0);
  }

  ngOnInit() {
    this.load();
    this.loadProducts();
  }

  loadProducts() {
    this.http.get<any[]>(`${this.config.apiUrl}/api/ews/loan-type-config/loan-types`).subscribe({
      next: (res) => {
        this.loanProductsOptions.set(res.map(r => ({
          label: r.product_code ? `${r.product_code} - ${r.name}` : r.name,
          value: r.name
        })));
      },
      error: (err) => console.error('Could not load loan products', err)
    });
  }

  load() {
    this.loadingTable = true;
    this.http.get<any[]>(`${this.config.apiUrl}/api/ews/loan-questions`).subscribe({
      next: (res) => {
        this.questions.set(res);
        this.loadingTable = false;
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not load questions' });
        this.loadingTable = false;
      }
    });
  }

  openNew() {
    this.form = { question_desc: '', type: 'text', options: [], reference_name: '', loan_products: [], is_active: true };
    this.isEdit = false;
    this.showDrawer.set(true);
  }

  edit(item: any) {
    this.form = { ...item };
    if (!this.form.options) this.form.options = [];
    if (!this.form.loan_products) this.form.loan_products = [];
    if (this.form.is_active === undefined) this.form.is_active = true;
    this.isEdit = true;
    this.showDrawer.set(true);
  }

  hideDrawer() {
    this.showDrawer.set(false);
  }

  delete(id: number) {
    if(!confirm('Are you sure you want to delete this question?')) return;
    this.http.delete(`${this.config.apiUrl}/api/ews/loan-questions/${id}`).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'Question deleted' });
        this.load();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not delete question' })
    });
  }

  save() {
    if (!this.form.question_desc || !this.form.reference_name || !this.form.type) {
      this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Desc, Type, and Reference Name are required' });
      return;
    }
    this.saving = true;
    const req = this.isEdit 
      ? this.http.put(`${this.config.apiUrl}/api/ews/loan-questions/${this.form.id}`, this.form)
      : this.http.post(`${this.config.apiUrl}/api/ews/loan-questions`, this.form);

    req.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Question saved successfully' });
        this.hideDrawer();
        this.saving = false;
        this.load();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not save question' });
        this.saving = false;
      }
    });
  }
}
