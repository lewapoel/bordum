import { OrderContext, OrderType, OrderView } from '@/models/order.ts';
import SummaryView from './components/SummaryView.tsx';
import ItemsView from './components/ItemsView.tsx';
import CtxProvider from './CtxProvider.tsx';
import { useContext } from 'react';

function CreateDealOrderCtx() {
  const ctx = useContext(OrderContext);

  return (
    <>
      {ctx && ctx.order && (
        <>
          {ctx.currentView === OrderView.Summary && (
            <SummaryView order={ctx.order} orderType={OrderType.CreateDeal} />
          )}
          {ctx.currentView === OrderView.Items && <ItemsView />}
        </>
      )}
    </>
  );
}

export default function CreateDealOrder() {
  return (
    <CtxProvider orderType={OrderType.CreateDeal}>
      <CreateDealOrderCtx />
    </CtxProvider>
  );
}
