import { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { OrderData, OrderItem } from '@/models/bitrix/order.ts';
import update from 'immutability-helper';
import {
  createOrderFromDeal,
  getOrder,
  updateOrder,
} from '@/api/bitrix/order.ts';
import { DocumentType, useAddDocument } from '@/api/comarch/document.ts';
import { OrderContext, OrderType, OrderView } from '@/models/order.ts';
import {
  getCompanyCode,
  getContactCode,
  getCurrentPlacementId,
} from '@/utils/bitrix24.ts';
import { getDeal } from '@/api/bitrix/deal.ts';
import {
  CustomerDefaultPrice,
  getCustomerDefaultPriceName,
} from '@/models/comarch/customer.ts';
import { getCompany } from '@/api/bitrix/company.ts';
import { getContact } from '@/api/bitrix/contact.ts';
import {
  useGetCustomerByName,
  useGetCustomerByNip,
} from '@/api/comarch/customer.ts';
import { CrmData } from '@/models/bitrix/crm.ts';
import { getCurrentUser } from '@/api/bitrix/user.ts';
import { DealData } from '@/models/bitrix/deal.ts';
import { AuthContext } from '../../components/AuthContext.tsx';
import { InvoiceData } from '@/models/bitrix/invoice.ts';
import { useGetCreditCustomer } from '@/api/comarch-sql/customer.ts';
import { getClientDueInvoices } from '@/api/bitrix/invoice.ts';
import { useGetInvoicesSummary } from '@/utils/invoice.ts';
import {
  DEAL_PAYMENT_TYPES,
  QUOTE_PAYMENT_TYPES,
} from '@/data/bitrix/const.ts';
import { ALLOWED_USERS } from '@/data/bitrix/user.ts';

interface CtxProviderProps {
  children: ReactNode;
  orderType: OrderType;
}

export default function CtxProvider({ children, orderType }: CtxProviderProps) {
  const { token, sqlToken } = useContext(AuthContext);
  const [selectedItem, setSelectedItem] = useState(0);
  const [currentView, setCurrentView] = useState<OrderView>(OrderView.Summary);

  // First and last name
  const [customerName, setCustomerName] = useState<string>();
  const customer = useGetCustomerByName(token, customerName);

  // NIP
  const [companyNip, setCompanyNip] = useState<string>();
  const company = useGetCustomerByNip(token, companyNip);

  const [maxDiscount, setMaxDiscount] = useState<number>();
  const [selectedPrice, setSelectedPrice] = useState<string>();
  const [order, setOrder] = useState<OrderData>();
  const [deal, setDeal] = useState<DealData>();
  const placementId = getCurrentPlacementId();

  const [pendingOrder, setPendingOrder] = useState<boolean>(false);
  const [allowAddingProduct, setAllowAddingProduct] = useState<boolean>(false);

  // Current client invoices
  const [invoices, setInvoices] = useState<Array<InvoiceData>>();
  const [code, setCode] = useState<string>();
  const creditCustomer = useGetCreditCustomer(sqlToken, code);
  const client = creditCustomer.data;
  const limitLeft = useGetInvoicesSummary(client, invoices)[2];

  const setClientData = useCallback(async (crm: CrmData) => {
    const defaultPriceName = getCustomerDefaultPriceName(
      CustomerDefaultPrice.Default,
    );

    let invoicesFetched = false;

    if (crm.companyId && +crm.companyId !== 0) {
      const res = await getCompany(crm.companyId);

      if (res) {
        setCode(getCompanyCode(res));
        getClientDueInvoices({
          companyId: res.id,
        }).then((res) => setInvoices(res));

        invoicesFetched = true;
      }

      if (res && res.nip) {
        setCompanyNip(res.nip);
      } else {
        setSelectedPrice(defaultPriceName);
      }
    }

    if (crm.contactId && +crm.contactId !== 0) {
      const res = await getContact(crm.contactId);

      if (res && !invoicesFetched) {
        setCode(getContactCode(res));
        getClientDueInvoices({
          contactId: res.id,
        }).then((res) => setInvoices(res));
      }

      if (res) {
        setCustomerName(`${res.name} ${res.lastName}`);
      } else {
        setSelectedPrice(defaultPriceName);
      }
    } else {
      setSelectedPrice(defaultPriceName);
    }
  }, []);

  useEffect(() => {
    if (!company.isPending) {
      setSelectedPrice(
        getCustomerDefaultPriceName(
          company.data
            ? company.data.defaultPrice
            : CustomerDefaultPrice.Default,
        ),
      );
    } else if (!customer.isPending) {
      setSelectedPrice(
        getCustomerDefaultPriceName(
          customer.data
            ? customer.data.defaultPrice
            : CustomerDefaultPrice.Default,
        ),
      );
    }
  }, [company.isPending, customer.data, company.data, customer.isPending]);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) {
        setMaxDiscount(res.discount);
        setAllowAddingProduct(ALLOWED_USERS.ADDING_PRODUCTS.includes(res.id));
      }
    });

    switch (orderType) {
      case OrderType.Create:
        if (!placementId) {
          alert('Nie można pobrać ID aktualnego deala');
          return;
        }

        getDeal(placementId).then((res) => {
          if (res) {
            setDeal(res);
            setOrder({
              items: [],
              deliveryAddress: {},
            });
            void setClientData(res);
          }
        });
        break;

      case OrderType.Edit:
        if (!placementId) {
          alert('Nie można pobrać ID aktualnej oferty');
          return;
        }

        getOrder(placementId).then((res) => {
          if (res) {
            setOrder(res);
            void setClientData(res);
          }
        });
        break;
    }
  }, [placementId, orderType, setClientData]);

  const addDocumentMutation = useAddDocument(token);

  const saveItem = useCallback(
    (item: OrderItem) => {
      // Adding new item when `selectedItem` is out of range
      if (selectedItem === order?.items.length) {
        setOrder((prev) => update(prev, { items: { $push: [item] } }));

        // Keep "new item" row selected
        setSelectedItem(selectedItem + 1);
        return 'add';
      } else {
        setOrder((prev) =>
          update(prev, { items: { [selectedItem]: { $set: item } } }),
        );
        return 'edit';
      }
    },
    [selectedItem, order],
  );

  const editItemQuantity = useCallback(
    (index: number, quantity: number) => {
      if (order && index >= 0 && index < order.items.length) {
        setOrder((prev) =>
          update(prev, {
            items: { [index]: { quantity: { $set: Math.max(1, quantity) } } },
          }),
        );

        return Math.max(1, quantity);
      }

      return null;
    },
    [order],
  );

  const removeItem = useCallback(() => {
    if (order && selectedItem < order.items.length) {
      setOrder((prev) =>
        update(prev, { items: { $splice: [[selectedItem, 1]] } }),
      );
    }
  }, [selectedItem, order]);

  const saveOrder = useCallback(async () => {
    if (order) {
      setPendingOrder(true);
      updateOrder(placementId, order.items, { ensureMeasures: true }).then(() =>
        setPendingOrder(false),
      );
    }
  }, [placementId, order]);

  const newOrder = useCallback(async () => {
    if (order && deal) {
      setPendingOrder(true);
      createOrderFromDeal(placementId).then((orderId) => {
        if (orderId) {
          updateOrder(orderId, order.items, { ensureMeasures: true }).then(
            () => {
              window.location.reload();
            },
          );
        } else {
          alert('Utworzona oferta nie ma identyfikatora');
        }

        setPendingOrder(false);
      });
    }
  }, [placementId, order, deal]);

  const addDocument = useCallback(
    async (documentType: DocumentType) => {
      if (order) {
        void addDocumentMutation.mutate({
          order: order,
          placementId,
          documentType,
        });
      }
    },
    [order, addDocumentMutation, placementId],
  );

  return (
    <OrderContext.Provider
      value={{
        maxDiscount,
        currentView,
        setCurrentView,
        saveItem,
        editItemQuantity,
        removeItem,
        selectedItem,
        setSelectedItem,
        order,
        selectedPrice,
        saveOrder,
        pendingOrder,
        createOrder: newOrder,
        addDocument: {
          mutation: addDocument,
          pending: addDocumentMutation.isPending,
        },
        invoices: {
          client,
          limitLeft,
          allowWarning:
            order?.paymentType === QUOTE_PAYMENT_TYPES.CREDIT_LIMIT ||
            deal?.paymentType === DEAL_PAYMENT_TYPES.CREDIT_LIMIT,
        },
        allowAddingProduct,
      }}
    >
      {order && selectedPrice && !creditCustomer.isLoading && invoices ? (
        <>{children}</>
      ) : (
        <h1>Ładowanie danych oferty...</h1>
      )}
    </OrderContext.Provider>
  );
}
