import { CrmData } from './crm.ts';

export type DealData = CrmData & {
  // Offering section
  depositRequired?: string;
  paymentVariant?: string;
  depositDueDate?: string;
  paymentType?: string;
  deliveryType?: string;
  installationService?: string;
};
