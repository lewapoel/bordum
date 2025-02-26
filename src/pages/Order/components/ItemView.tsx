import { PRICES } from "../../../data/prices.ts";
import { useContext, useMemo, useState } from "react";
import { OrderContext, OrderView } from "../../../models/order.ts";

export default function ItemView() {
  const ctx = useContext(OrderContext);
  const [selectedPrice, setSelectedPrice] = useState("zakupu");
  const [quantity, setQuantity] = useState(0);

  const price = useMemo(
    () => ctx?.currentItem?.prices[selectedPrice],
    [ctx, selectedPrice],
  );

  return ctx?.currentItem && price ? (
    <div>
      <h1 className="mb-5">Towar</h1>

      <table>
        <thead>
          <tr>
            <th>Nazwa towaru</th>
            <th>Ilość</th>
            <th>Jedn. miary</th>
            <th>Rodzaj ceny</th>
            <th>Cena jedn.</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{ctx.currentItem.name}</td>
            <td>
              <input
                type="number"
                min="0"
                // max={} TODO
                value={quantity}
                onChange={(e) => setQuantity(+e.target.value)}
              />
            </td>
            <td>{ctx.currentItem.unit}</td>
            <td>
              <select
                className="prices"
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
              >
                {PRICES.map((price, idx) => (
                  <option value={price} key={idx}>
                    {price}
                  </option>
                ))}
              </select>
            </td>
            <td>{price.value}</td>
            <td>{(price.value * quantity).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="justify-center flex items-center gap-2 mt-10">
        <button
          onClick={() => {
            if (!ctx?.currentItem) {
              return;
            }

            ctx.saveItem({
              productName: ctx.currentItem.name,
              quantity: quantity,
              unit: ctx.currentItem.unit,
              unitPrice: ctx.currentItem.prices[selectedPrice].value,
            });
            ctx.setCurrentView(OrderView.Summary);
          }}
        >
          Potwierdź
        </button>
        <button onClick={() => ctx.setCurrentView(OrderView.Items)}>
          Anuluj
        </button>
      </div>
    </div>
  ) : (
    <></>
  );
}
