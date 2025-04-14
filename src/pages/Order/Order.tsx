import SummaryView from './components/SummaryView.tsx';
import { useContext } from 'react';
import ItemsView from './components/ItemsView.tsx';
import { OrderContext, OrderType, OrderView } from '../../models/order.ts';
import CtxProvider from './CtxProvider.tsx';

function OrderCtx() {
  const ctx = useContext(OrderContext);

  return (
    <>
      {ctx && ctx.order && (
        <>
          {ctx.currentView === OrderView.Summary && (
            <SummaryView order={ctx.order} orderType={OrderType.Edit} />
          )}
          {ctx.currentView === OrderView.Items && <ItemsView />}
        </>
      )}
    </>
  );
}

export default function Order() {
  return (
    <CtxProvider orderType={OrderType.Edit}>
      <OrderCtx />
    </CtxProvider>
  );
}
