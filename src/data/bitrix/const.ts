export const RETURNS_FOLDER_ID = 18324;

// STATUS_ID field values for quotes
export const QUOTE_STATUSES = {
  WAITING_FOR_SHORTAGES: 'UC_OFZSTL',
  READY_TO_PACK: 'UC_IR88SF',
};

// Payment type field values for quotes
export const QUOTE_PAYMENT_TYPES = {
  TRANSFER: '338',
  CASH: '340',
  CREDIT_LIMIT: '3364',
};

// Payment type field values for deals
export const DEAL_PAYMENT_TYPES = {
  TRANSFER: '360',
  CASH: '362',
  CREDIT_LIMIT: '3362',
};

// Payment type field values for invoices
export const INVOICE_PAYMENT_TYPES = {
  TRANSFER: '3404',
  CASH: '3406',
  CREDIT_LIMIT: '3408',
};

export const INVOICE_CLIENT_TYPES = {
  INDIVIDUAL: '2504',
  COMPANY: '2506',
};

// Stage field values for invoices
export const INVOICE_STAGES = {
  AWAITING_PAYMENT: 'DT31_2:N',
  OVERDUE: 'DT31_2:UC_MVUA7D',
  DEBT_COLLECTION: 'DT31_2:UC_W9O8L3',
  PAID: 'DT31_2:P',
  PAYMENT_REJECTED: 'DT31_2:D',
};

export const ENTITY_TYPES = {
  INVOICE: 31,
};
