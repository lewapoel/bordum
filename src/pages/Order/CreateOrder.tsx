import { OrderContext, OrderType, OrderView } from '../../models/order.ts';
import SummaryView from './components/SummaryView.tsx';
import ItemsView from './components/ItemsView.tsx';
import CtxProvider from './CtxProvider.tsx';
import { useContext } from 'react';

function CreateOrderCtx() {
  const ctx = useContext(OrderContext);

  return (
    <>
      {ctx && ctx.order && (
        <>
          {ctx.currentView === OrderView.Summary && (
            <SummaryView order={ctx.order} orderType={OrderType.Create} />
          )}
          {ctx.currentView === OrderView.Items && <ItemsView />}
        </>
      )}
    </>
  );
}

export default function CreateOrder() {
  return (
    <CtxProvider orderType={OrderType.Create}>
      <CreateOrderCtx />
    </CtxProvider>
  );
}
