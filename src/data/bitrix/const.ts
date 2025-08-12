export const RETURNS_FOLDER_ID = 18324;

// STATUS_ID field values for quotes
export const QUOTE_STATUSES = {
  WAITING_FOR_SHORTAGES: 'UC_OFZSTL',
  READY_TO_PACK: 'UC_IR88SF',
};

// Stage field values for settlements
export const SETTLEMENT_STAGES = {
  INVOICE: {
    AWAITING_PAYMENT: 'DT1086_34:NEW',
    PAYMENT_DUE: 'DT1086_34:CLIENT',
  },
  NO_INVOICE: {
    ACCEPT_CASH_PAYMENT: 'DT1086_36:NEW',
    PAYMENT_DUE: 'DT1086_36:UC_UVHARI',
  },
};

export const SETTLEMENT_CATEGORIES = {
  INVOICE: 34,
  NO_INVOICE: 36,
};

export const ENTITY_TYPES = {
  SETTLEMENT: 1086,
};
