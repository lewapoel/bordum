import { useMemo } from 'react';
import { CreditCustomer } from '../api/comarch-sql/customer.ts';
import { SettlementData } from '../models/bitrix/settlement.ts';

export function useGetSettlementsSummary(
  client?: CreditCustomer | null,
  settlements?: Array<SettlementData>,
) {
  const creditLimit = useMemo(() => client?.creditLimit ?? 0, [client]);
  const unpaidSettlements = useMemo(
    () =>
      settlements?.reduce((acc, settlement) => {
        if (settlement.paymentLeft) {
          acc += settlement.paymentLeft;
        }

        return acc;
      }, 0) ?? 0,
    [settlements],
  );

  const limitLeft = useMemo(
    () => creditLimit - unpaidSettlements,
    [creditLimit, unpaidSettlements],
  );

  return [creditLimit, unpaidSettlements, limitLeft];
}
