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
  getBitrix24,
  getCompanyCode,
  getContactCode,
  getCurrentPlacementId,
} from '@/utils/bitrix24.ts';
import { createDeal, getDeal, openDeal } from '@/api/bitrix/deal.ts';
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
import { getCurrentUser, isCurrentUserAdmin } from '@/api/bitrix/user.ts';
import { DealData } from '@/models/bitrix/deal.ts';
import { AuthContext } from '../../components/AuthContext.tsx';
import { InvoiceData } from '@/models/bitrix/invoice.ts';
import { useGetCreditCustomer } from '@/api/comarch-sql/customer.ts';
import { getClientDueCreditInvoices } from '@/api/bitrix/invoice.ts';
import { useGetInvoicesSummary } from '@/utils/invoice.ts';
import {
  DEAL_PAYMENT_TYPES,
  QUOTE_PAYMENT_TYPES,
} from '@/data/bitrix/const.ts';
import { ALLOWED_USERS } from '@/data/bitrix/user.ts';
import { calculateDiscountPrice } from '@/utils/item.ts';
import { normalizeIndex } from '@/lib/utils.ts';

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
  const [selectedPrice, setSelectedPrice] = useState<string>(
    getCustomerDefaultPriceName(CustomerDefaultPrice.Default),
  );

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
    let invoicesFetched = false;

    if (crm.companyId && +crm.companyId !== 0) {
      const res = await getCompany(crm.companyId);

      if (res) {
        setCode(await getCompanyCode(res));
        getClientDueCreditInvoices({
          companyId: res.id,
        }).then((res) => setInvoices(res));

        invoicesFetched = true;
      }

      if (res && res.nip) {
        setCompanyNip(res.nip);
      }
    }

    if (crm.contactId && +crm.contactId !== 0) {
      const res = await getContact(crm.contactId);

      if (res && !invoicesFetched) {
        setCode(await getContactCode(res));
        getClientDueCreditInvoices({
          contactId: res.id,
        }).then((res) => setInvoices(res));
      }

      if (res) {
        setCustomerName(`${res.name} ${res.lastName}`);
      }
    }

    if (!invoicesFetched) {
      setInvoices([]);
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
    getCurrentUser().then((currentUser) => {
      if (currentUser) {
        setMaxDiscount(currentUser.discount);

        isCurrentUserAdmin().then((isAdmin) => {
          const canAddProduct =
            ALLOWED_USERS.ADDING_PRODUCTS.includes(currentUser.id) || isAdmin;
          setAllowAddingProduct(canAddProduct);
        });
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

      case OrderType.CreateDeal:
        setOrder({
          items: [],
          deliveryAddress: {},
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

  const addDocumentMutation = useAddDocument(token, sqlToken);

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
        const newQuantity = Math.max(0.01, quantity);

        setOrder((prev) =>
          update(prev, {
            items: {
              [index]: { quantity: { $set: newQuantity } },
            },
          }),
        );

        return newQuantity;
      }

      return 0;
    },
    [order],
  );

  const editItemDiscount = useCallback(
    (index: number, discount: number): number => {
      if (order && index >= 0 && index < order.items.length) {
        const userMaxDiscount = maxDiscount ?? 0;
        const productMaxDiscount = order.items[index].maxDiscount ?? 0;
        const bruttoUnitPrice = order.items[index].bruttoUnitPrice;

        if (bruttoUnitPrice === undefined) {
          return order.items[index].discountRate ?? 0;
        }

        const finalMaxDiscount = Math.min(userMaxDiscount, productMaxDiscount);
        const newDiscount = Math.floor(
          Math.min(Math.max(0, discount), finalMaxDiscount),
        );

        setOrder((prev) =>
          update(prev, {
            items: {
              [index]: {
                discountRate: { $set: newDiscount },
                unitPrice: {
                  $set: calculateDiscountPrice(bruttoUnitPrice, newDiscount),
                },
              },
            },
          }),
        );

        return newDiscount;
      }

      return 0;
    },
    [order, maxDiscount],
  );

  const moveItem = useCallback(
    (difference: number) => {
      const item = order?.items?.[selectedItem];

      if (order && item && selectedItem < order.items.length) {
        const newIndex = normalizeIndex(
          order.items.length,
          selectedItem + difference,
        );

        setOrder((prev) =>
          update(prev, {
            items: {
              $splice: [
                [selectedItem, 1],
                [newIndex, 0, item],
              ],
            },
          }),
        );
        setSelectedItem(newIndex);
      }
    },
    [selectedItem, order],
  );

  const removeItem = useCallback(() => {
    const bitrixId = order?.items?.[selectedItem]?.id;

    if (
      order &&
      selectedItem < order.items.length &&
      (bitrixId === undefined || !order.packagingData?.[bitrixId]?.saved)
    ) {
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
    const bx24 = getBitrix24();
    if (!bx24) {
      return;
    }

    setPendingOrder(true);

    let dealId = placementId;
    if (orderType === OrderType.CreateDeal) {
      const result = await createDeal();

      if (result) {
        dealId = result;
      } else {
        alert('Utworzona oferta nie ma identyfikatora');
      }

      let clientDataFilled = false;
      do {
        alert('Uzupełnij dane klienta w dealu, zapisz je i zamknij okno deala');

        await openDeal(dealId);
        const updatedDeal = await getDeal(dealId);

        if (updatedDeal?.contactId || updatedDeal?.companyId) {
          clientDataFilled = true;
        }
      } while (!clientDataFilled);
    }

    if (order && dealId) {
      const orderId = await createOrderFromDeal(dealId);

      if (orderId) {
        await updateOrder(orderId, order.items, { ensureMeasures: true });
        bx24.openPath(`/crm/type/7/details/${orderId}/`);
        window.location.reload();
      } else {
        alert('Utworzona oferta nie ma identyfikatora');
      }
    }

    setPendingOrder(false);
  }, [placementId, order, orderType]);

  const addDocument = useCallback(
    async (documentType: DocumentType, exportDocument: boolean = true) => {
      if (order) {
        void addDocumentMutation.mutate({
          order: order,
          placementId,
          documentType,
          exportDocument,
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
        editItemDiscount,
        moveItem,
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
      {order &&
      (orderType === OrderType.CreateDeal || invoices) &&
      !creditCustomer.isLoading ? (
        <>{children}</>
      ) : (
        <h1>Ładowanie danych oferty...</h1>
      )}
    </OrderContext.Provider>
  );
}
