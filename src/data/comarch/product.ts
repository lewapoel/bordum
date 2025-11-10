import { ItemType } from '@/models/bitrix/order.ts';

export const PRODUCT_TYPES: Record<ItemType, string> = {
  [ItemType.STANDARD]: 'Standard',
  [ItemType.CUSTOM_ITEM]: 'Niestandardowa pozycja',
  [ItemType.CUSTOM_TEMPLATE_ITEM]: 'Niestandardowy wymiar',
} as const;
