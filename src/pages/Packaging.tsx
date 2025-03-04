import { useEffect, useState } from "react";
import { OrderItem } from "../models/order.ts";
import { getCurrentPlacementId } from "../utils/bitrix24.ts";
import { getOrder } from "../api/bitrix24/order.ts";
import update from "immutability-helper";
import moment from "moment";

type PackagingData = {
  quality: number;
  packer: string;
  date: string;
};

export default function Packaging() {
  const placementId = getCurrentPlacementId();
  const [order, setOrder] = useState<Array<OrderItem>>([]);
  const [firstLoad, setFirstLoad] = useState(false);

  // Range of [1, 10]
  const qualities = Array(10)
    .fill(0)
    .map((_, i) => i + 1);

  const [packagingData, setPackagingData] = useState<Array<PackagingData>>([]);

  useEffect(() => {
    if (!placementId) {
      alert("Nie można pobrać ID aktualnej oferty");
      return;
    }

    getOrder(placementId).then((res) => {
      if (res) {
        setOrder(res);
        setPackagingData(
          Array(res.length).fill({
            quality: 1,
            packer: "",
            date: moment().format("YYYY-MM-DD"),
          }),
        );
        setFirstLoad(true);
      }
    });
  }, [placementId]);

  return (
    <div>
      {firstLoad ? (
        <>
          <h1 className="mb-5">Pakowanie</h1>

          <table>
            <thead>
              <tr>
                <th>Nazwa towaru</th>
                <th>Ilość</th>
                <th>Jedn. miary</th>
                <th>Jakość</th>
                <th>Osoba pakująca</th>
                <th>Data zapakowania</th>
              </tr>
            </thead>
            <tbody>
              {order.map((item, idx) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>
                    <select
                      value={packagingData[idx].quality}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: { quality: { $set: +e.target.value } },
                          }),
                        );
                      }}
                    >
                      {qualities.map((quality, idx) => (
                        <option value={quality} key={idx}>
                          {quality}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Imię i nazwisko"
                      value={packagingData[idx].packer}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: { packer: { $set: e.target.value } },
                          }),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={packagingData[idx].date}
                      onChange={(e) => {
                        setPackagingData((prev) =>
                          update(prev, {
                            [idx]: { date: { $set: e.target.value } },
                          }),
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <h1>Ładowanie danych zamówienia...</h1>
      )}
    </div>
  );
}
