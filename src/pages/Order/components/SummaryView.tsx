import clsx from "clsx";
import {
  OrderContext,
  OrderItem,
  OrderItems,
  OrderView,
} from "../../../models/order.ts";
import { useContext } from "react";

interface SummaryRowProps {
  index: number;
  selectedItem: number;
  setSelectedItem: (index: number) => void;
  item?: OrderItem;
  className?: string;
  setCurrentView: (view: OrderView) => void;
}

function SummaryRow({
  index,
  setSelectedItem,
  setCurrentView,
  selectedItem,
  item,
  className,
}: SummaryRowProps) {
  return (
    <tr
      onMouseEnter={() => setSelectedItem(index)}
      onClick={() => setCurrentView(OrderView.Items)}
      className={clsx(
        selectedItem === index ? "bg-blue-500" : "",
        "cursor-pointer",
        className,
      )}
    >
      <td>{index + 1}</td>
      <td>{item?.productName}</td>
      <td>{item?.quantity}</td>
      <td>{item?.unit}</td>
      <td>{item?.unitPrice}</td>
      <td>{item ? (item.unitPrice * item.quantity).toFixed(2) : null}</td>
    </tr>
  );
}

interface SummaryViewProps {
  order: OrderItems;
}

export default function SummaryView({ order }: SummaryViewProps) {
  const ctx = useContext(OrderContext);

  return ctx ? (
    <div>
      <h1 className="mb-5">Zamówienie</h1>
      <table>
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Nazwa towaru</th>
            <th>Ilość</th>
            <th>Jedn. miary</th>
            <th>Cena jedn.</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          {order.map((item, idx) => (
            <SummaryRow
              setCurrentView={ctx.setCurrentView}
              key={idx}
              setSelectedItem={ctx.setSelectedItem}
              selectedItem={ctx.selectedItem}
              index={idx}
              item={item}
            />
          ))}
          <SummaryRow
            setCurrentView={ctx.setCurrentView}
            setSelectedItem={ctx.setSelectedItem}
            selectedItem={ctx.selectedItem}
            index={order.length}
          />
        </tbody>
      </table>
    </div>
  ) : (
    <></>
  );
}
