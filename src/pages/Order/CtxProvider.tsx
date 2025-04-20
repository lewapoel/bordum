import { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { OrderData, OrderItem } from '../../models/bitrix/order.ts';
import update from 'immutability-helper';
import {
  createOrder,
  getOrder,
  updateOrder,
} from '../../api/bitrix24/order.ts';
import { DocumentType, useAddDocument } from '../../api/comarch/document.ts';
import { OrderContext, OrderType, OrderView } from '../../models/order.ts';
import { AuthContext } from '../../api/comarch/auth.ts';
import { getCurrentPlacementId } from '../../utils/bitrix24.ts';
import { getDeal } from '../../api/bitrix24/deal.ts';
import {
  CustomerDefaultPrice,
  getCustomerDefaultPriceName,
} from '../../models/comarch/customer.ts';
import { getCompany } from '../../api/bitrix24/company.ts';
import { getContact } from '../../api/bitrix24/contact.ts';
import {
  useGetCustomerByName,
  useGetCustomerByNip,
} from '../../api/comarch/customer.ts';
import { CrmData } from '../../models/bitrix/crm.ts';
import { getCurrentUser } from '../../api/bitrix24/user.ts';
import { DealData } from '../../models/bitrix/deal.ts';

interface CtxProviderProps {
  children: ReactNode;
  orderType: OrderType;
}

export default function CtxProvider({ children, orderType }: CtxProviderProps) {
  const { token } = useContext(AuthContext);
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

  const setClientData = useCallback((crm: CrmData) => {
    const defaultPriceName = getCustomerDefaultPriceName(
      CustomerDefaultPrice.Default,
    );

    if (crm.companyId && +crm.companyId !== 0) {
      getCompany(crm.companyId).then((res) => {
        if (res) {
          setCompanyNip(res.nip);
        } else {
          setSelectedPrice(defaultPriceName);
        }
      });
    } else if (crm.contactId && +crm.contactId !== 0) {
      getContact(crm.contactId).then((res) => {
        if (res) {
          setCustomerName(`${res.name} ${res.lastName}`);
        } else {
          setSelectedPrice(defaultPriceName);
        }
      });
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
            });
            setClientData(res);
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
            setClientData(res);
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
            items: { [index]: { quantity: { $set: quantity } } },
          }),
        );
      }
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
      updateOrder(placementId, order.items, true).then(() =>
        setPendingOrder(false),
      );
    }
  }, [placementId, order]);

  const newOrder = useCallback(async () => {
    if (order && deal) {
      setPendingOrder(true);
      createOrder(placementId, deal).then((orderId) => {
        if (orderId) {
          void updateOrder(orderId, order.items, true);
        } else {
          alert('Utworzona oferta nie ma identyfikatora');
        }

        setPendingOrder(false);
      });
    }
  }, [placementId, order, deal]);

  const addDocument = useCallback(
    async (documentType: DocumentType, ignoreDeleteError = false) => {
      if (order) {
        void addDocumentMutation.mutate({
          order: order,
          placementId,
          documentType,
          ignoreDeleteError,
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
      }}
    >
      {order && selectedPrice ? (
        <>{children}</>
      ) : (
        <h1>Ładowanie danych oferty...</h1>
      )}
    </OrderContext.Provider>
  );
}
