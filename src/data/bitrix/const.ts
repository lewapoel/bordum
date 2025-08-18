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

// Stage field values for settlements
export const SETTLEMENT_STAGES = {
  BALANCE: {
    NEW_LIMIT_PAYMENT: 'DT1086_38:NEW',
    DUE_PAYMENT: 'DT1086_38:PREPARATION',
  },
};

export const SETTLEMENT_CATEGORIES = {
  BALANCE: 38,
};

export const ENTITY_TYPES = {
  SETTLEMENT: 1086,
};
