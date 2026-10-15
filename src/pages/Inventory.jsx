import { AlertTriangle } from "lucide-react";
import { Card, SectionTitle, StatCard, Table, Tr, Td, Badge } from "../components/ui";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "../context/ApiContext";
import constanst from "../config/constants";

export default function Inventory() {
  const { fetchWithLoading } = useApi();
  const [inventory, setInventory] = useState([]);
  const [lowInventory, setLowInventory] = useState([]);

  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/inventory`);
      const data = await response.json();
      setInventory(data.data);
      let tempLowInventory = [];
      data.data.map(element => {
        if (element.reorder_level >= element.stock_quantity) {
          tempLowInventory.push(element);
        }
      })
      setLowInventory(tempLowInventory);
    } catch (error) {
      console.log(error)
    }
  }, [fetchWithLoading]);

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={inventory?.length} />
        <StatCard label="In Stock" value={0} />
        <StatCard label="Low Stock" value={0} />
        <StatCard label="Out of Stock" value={0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Stock Levels" />
          <Table columns={["Product", "Category", "Stock", "Status"]}>
            {inventory.map((i) => (
              <Tr key={i.id}>
                <Td className="font-medium">{i.product_name}</Td>
                <Td className="text-[var(--color-muted)]">{i.product_category_name}</Td>
                <Td>{i.stock_quantity}</Td>
                <Td><Badge>{i.reorder_level >= i.stock_quantity ? 'Low Stock' : 'In Stock'}</Badge></Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Low Stock Items"
            action={<AlertTriangle size={16} className="text-[var(--color-orange)]" />}
          />
          <div className="space-y-3">
            {lowInventory.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-[var(--color-orange)]/10 border border-[var(--color-orange)]/20">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-medium">{item.product_name}</p>
                  <p className="text-[12px] text-[var(--color-orange)] font-semibold">{item.quantity_in_stock} left</p>
                </div>
                <p className="text-[11px] text-[var(--color-faint)] mt-0.5">Reorder level: {item.reorder_level}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
