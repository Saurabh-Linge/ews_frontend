import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ApiVerificationService } from '../../services/api-verification.service';
import { catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

import { ALL_SUREPASS_APIS } from './all-surepass-apis';

interface ApiInput {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
}

interface ApiDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  inputs: ApiInput[];
  action: ((payload: any) => any) | null;
  isIntegrated?: boolean;
}

import { HeroComponent } from '../../../../shared/components/ui/hero/hero';
import { MetricCardComponent } from '../../../../shared/components/ui/metric-card/metric-card';

@Component({
  selector: 'app-api-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawerModule, DialogModule, ToastModule, ButtonModule, InputTextModule, KeyValuePipe, HeroComponent, MetricCardComponent],
  providers: [MessageService],
  templateUrl: './api-verification-modal.component.html',
  styleUrls: ['./api-verification-modal.component.scss'],
})
export class ApiVerificationModalComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiVerificationService);
  private messageService = inject(MessageService);

  // BUG-FIX: track active subscription so we can cancel if user switches API mid-flight
  private activeSub: Subscription | null = null;

  visible = false;
  searchQuery = '';

  apis: ApiDefinition[] = [];
  filteredApis: ApiDefinition[] = [];
  selectedApi: ApiDefinition | null = null;

  formPayload: Record<string, string> = {};

  loading = false;
  result: any = null;
  resultError: string | undefined = undefined;

  ngOnInit() {
    this.initializeApis();
  }

  ngOnDestroy() {
    this.activeSub?.unsubscribe();
  }

  // ── Derived / getters ─────────────────────────────────────────────────────
  /** De-duplicated directors by DIN + name, computed once result is set */
  get uniqueDirectors(): any[] {
    const dirs: any[] = this.result?.details?.directors ?? [];
    const seen = new Set<string>();
    return dirs.filter((d) => {
      const key = `${d.din_number}__${d.director_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  show() {
    this.visible = true;
    this.searchQuery = '';
    this.filteredApis = [...this.apis];
    this.result = null;
    this.resultError = undefined;
    this.loading = false;
    // Auto-select first API and set defaults
    if (this.apis.length) {
      this.selectApi(this.apis[0]);
    }
  }

  hide() {
    this.visible = false;
    this.activeSub?.unsubscribe();
    this.activeSub = null;
  }

  initializeApis() {
    this.apis = [
      {
        id: 'udyam',
        name: 'UDYAM Verification',
        category: 'Corporate',
        icon: 'pi-building',
        description: 'Verify MSME Udyam Registration details',
        inputs: [{ key: 'id_number', label: 'UDYAM Number', type: 'text' }],
        action: (p) => this.apiService.udyamVerification(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'gstin',
        name: 'GST Verification',
        category: 'Corporate',
        icon: 'pi-file',
        description: 'Advanced GSTIN verification and details lookup',
        inputs: [{ key: 'id_number', label: 'GSTIN', type: 'text' }],
        action: (p) => this.apiService.gstVerification(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'cin_by_name',
        name: 'Company CIN by Name',
        category: 'Corporate',
        icon: 'pi-search',
        description: 'Search for Corporate Identity Number by Company Name',
        inputs: [{ key: 'company_name_search', label: 'Company Name', type: 'text' }],
        action: (p) => this.apiService.getCinByName(p.company_name_search),
        isIntegrated: true,
      },
      {
        id: 'company_details',
        name: 'CIN to Company Details',
        category: 'Corporate',
        icon: 'pi-briefcase',
        description: 'Get detailed company information using CIN',
        inputs: [{ key: 'id_number', label: 'CIN', type: 'text' }],
        action: (p) => this.apiService.getCompanyDetails(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'din',
        name: 'DIN Details',
        category: 'Corporate',
        icon: 'pi-id-card',
        description: 'Verify Director Identification Number',
        inputs: [{ key: 'id_number', label: 'DIN', type: 'text' }],
        action: (p) => this.apiService.getDinDetails(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'din_phone',
        name: 'DIN to Phone',
        category: 'Corporate',
        icon: 'pi-phone',
        description: 'Get phone number associated with a DIN',
        inputs: [{ key: 'id_number', label: 'DIN', type: 'text' }],
        action: (p) => this.apiService.getDinToPhone(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'pan_to_cin',
        name: 'PAN to CIN',
        category: 'Corporate',
        icon: 'pi-credit-card',
        description: 'Find CIN associated with a Company PAN',
        inputs: [{ key: 'pan_number', label: 'PAN Number', type: 'text' }],
        action: (p) => this.apiService.getPanToCin(p.pan_number),
        isIntegrated: true,
      },
      {
        id: 'pan_to_gstin',
        name: 'PAN to GSTIN',
        category: 'Corporate',
        icon: 'pi-receipt',
        description: 'Find all GSTINs associated with a PAN',
        inputs: [{ key: 'id_number', label: 'PAN Number', type: 'text' }],
        action: (p) => this.apiService.getPanToGstin(p.id_number),
        isIntegrated: true,
      },
      {
        id: 'rera_details',
        name: 'RERA Details',
        category: 'Real Estate',
        icon: 'pi-home',
        description: 'Verify Real Estate Regulatory Authority details',
        inputs: [
          { key: 'registration_number', label: 'Registration Number', type: 'text' },
          {
            key: 'registration_type',
            label: 'Registration Type',
            type: 'select',
            options: ['project', 'agent'],
          },
          { key: 'state_name', label: 'State Name', type: 'select', options: [] },
        ],
        action: (p) =>
          this.apiService.getReraDetails(
            p.registration_number,
            p.registration_type,
            p.state_name,
          ),
        isIntegrated: true,
      },
      {
        id: 'karnataka_land',
        name: 'Karnataka Land Records',
        category: 'Land Records',
        icon: 'pi-map',
        description: 'Verify land records for Karnataka',
        inputs: [
          { key: 'district', label: 'District', type: 'text' },
          { key: 'taluka', label: 'Taluka', type: 'text' },
          { key: 'hobli', label: 'Hobli', type: 'text' },
          { key: 'village', label: 'Village', type: 'text' },
          { key: 'khata_no', label: 'Khata Number', type: 'text' },
        ],
        action: (p) => this.apiService.getKarnatakaLandRecords(p),
        isIntegrated: true,
      },
      {
        id: 'gujarat_land',
        name: 'Gujarat Land Records',
        category: 'Land Records',
        icon: 'pi-map',
        description: 'Verify land records for Gujarat',
        inputs: [
          { key: 'district', label: 'District', type: 'text' },
          { key: 'taluka', label: 'Taluka', type: 'text' },
          { key: 'village', label: 'Village', type: 'text' },
          { key: 'block', label: 'Block', type: 'text' },
          { key: 'owner_name', label: 'Owner Name', type: 'text' },
        ],
        action: (p) => this.apiService.getGujaratLandRecords(p),
        isIntegrated: true,
      },
    ];

    // Append the remaining APIs from Surepass that aren't manually integrated
    const integratedIds = this.apis.map((a) => a.id);
    for (const sApi of ALL_SUREPASS_APIS) {
      if (!integratedIds.includes(sApi.Endpoint)) {
        this.apis.push({
          id: sApi.Endpoint,
          name: sApi['API Name'],
          category: 'All APIs',
          icon: 'pi-cog', // Generic icon
          description: sApi.Description || 'No description available.',
          inputs: [],
          action: null,
          isIntegrated: false,
        });
      }
    }

    this.filteredApis = [...this.apis];

    // Pre-load RERA states once
    this.apiService
      .getReraStateList()
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res?.data?.states?.length) {
          const reraApi = this.apis.find((a) => a.id === 'rera_details');
          const stateInput = reraApi?.inputs.find((i) => i.key === 'state_name');
          if (stateInput) {
            stateInput.options = res.data.states;
            // If rera is currently selected, refresh the default
            if (this.selectedApi?.id === 'rera_details') {
              this.formPayload['state_name'] = res.data.states[0];
            }
          }
        }
      });
  }

  filterApis() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredApis = [...this.apis];
    } else {
      this.filteredApis = this.apis.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q),
      );
    }
  }

  selectApi(api: ApiDefinition) {
    if (this.selectedApi?.id === api.id) return; // already selected
    // Cancel any in-flight request
    this.activeSub?.unsubscribe();
    this.activeSub = null;

    this.selectedApi = api;
    this.formPayload = {};
    this.result = null;
    this.resultError = undefined;
    this.loading = false;

    // Pre-fill defaults for selects
    api.inputs.forEach((input) => {
      if (input.type === 'select' && input.options?.length) {
        this.formPayload[input.key] = input.options[0];
      }
    });
  }

  runVerification() {
    if (!this.selectedApi || this.loading || !this.selectedApi.action) return;

    // Validate: all inputs must be filled
    for (const input of this.selectedApi.inputs) {
      const val = (this.formPayload[input.key] ?? '').toString().trim();
      if (!val) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Required Field',
          detail: `"${input.label}" is required.`,
        });
        return;
      }
    }

    // Cancel any previous in-flight request
    this.activeSub?.unsubscribe();

    this.loading = true;
    this.result = null;
    this.resultError = undefined;

    this.activeSub = this.selectedApi.action({ ...this.formPayload }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.result = res.data;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Data retrieved successfully.',
        });
      },
      error: (err: any) => {
        this.loading = false;
        // BUG-FIX: backend now wraps error in err.error.message
        this.resultError =
          err.error?.message || err.message || 'Verification failed. Please try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Verification Failed',
          detail: this.resultError,
        });
      },
    });
  }

  formatValue(value: any): string {
    if (value === null || value === undefined || value === '' || value === '1800-01-01')
      return 'Not Available';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Not Available';
      // if it's a simple string/number array, join; else count items
      if (typeof value[0] !== 'object') return value.join(', ');
      return `${value.length} item(s)`;
    }
    if (typeof value === 'object') return 'See details below';
    return String(value);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString || dateString === '1800-01-01') return 'Not Available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace(/ /g, '-');
    } catch {
      return dateString;
    }
  }

  formatKey(key: string): string {
    if (!key) return '';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatCapital(amount: string | number | null): string {
    if (!amount) return 'Not Available';
    const n = Number(amount);
    if (isNaN(n)) return String(amount);
    return '₹ ' + n.toLocaleString('en-IN');
  }
}
