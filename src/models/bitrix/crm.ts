import { Company } from '@/models/bitrix/company.ts';
import { Contact } from '@/models/bitrix/contact.ts';

export type CrmData = {
  id?: number;
  companyId?: number;
  company?: Company;
  contact?: Contact;
  contactId?: number;
  categoryId?: number;
};
