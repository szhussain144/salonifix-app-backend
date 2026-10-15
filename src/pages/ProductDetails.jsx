import { useParams, Link } from "react-router-dom";
import {  } from "lucide-react";
import { Input,Card, SectionTitle, Table, Tr, Td, Badge, Button } from "../components/ui";
import { useCallback, useEffect, useState } from "react";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { formatBookingDate } from "../context/functions";
import { BackLink } from "../components/DetailLink";
import { formatAmount } from "../components/format";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [productInventory, setProductInventory] = useState(null);
  const [addStock, setAddStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const { fetchWithLoading } = useApi();

  const fetchProductDetails = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/products/${id}`);
      const data = await response.json();
      console.log('Fetched Product Details:', data.data);
      setProduct(data.data);
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }, [fetchWithLoading, id]);

  const fetchProductInventoryDetails = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/inventory/product/${id}`);
      const data = await response.json();
      console.log('Fetched Product Details:', data.data);
      setProductInventory(data.data);
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }, [fetchWithLoading, id]);

  useEffect(() => {
    fetchProductDetails();
    fetchProductInventoryDetails();
  }, [fetchProductDetails, fetchProductInventoryDetails]);

  const submitStock = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        product_id: id,
        quantity_in_stock: stockQuantity,
        product_category: product.product_category_id
      }

      await fetchWithLoading(`${constanst.API_URL}/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setStockQuantity(0);
      setAddStock(false);
      fetchProductInventoryDetails();
      fetchProductDetails();

    } catch {

    }
  }
  return (
    <div className="space-y-5">
      <BackLink to="/products">Back to Products</BackLink>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          {/* <div className="w-full aspect-square rounded-xl bg-[var(--color-panel-alt)] flex items-center justify-center mb-4">
            <Package size={40} className="text-[var(--color-accent)]" />
          </div> */}
          <p className="text-[16px] font-semibold">{product?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[13px] text-[var(--color-muted)]">{formatAmount(product?.unit_price)}</p>
            <Badge>{product?.is_active ? "Active" : "Inactive"}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-[var(--color-panel-alt)] rounded-lg p-3">
              <p className="text-[11px] text-[var(--color-faint)]">Stock</p>
              <p className="text-[16px] font-semibold">{product?.stock_quantity}</p>
            </div>
            <div className="bg-[var(--color-panel-alt)] rounded-lg p-3">
              <p className="text-[11px] text-[var(--color-faint)]">Purchase Price</p>
              <p className="text-[16px] font-semibold">{formatAmount(product?.unit_price)}</p>
            </div>
          </div>

          {/* <div className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Brand</span>
              <span>{productDetail.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Supplier</span>
              <span>{productDetail.supplier}</span>
            </div>
          </div> */}
          <p className="text-[12px] text-[var(--color-faint)] mt-3">{product?.description}</p>

          <div className="flex gap-2 mt-5">
            <Link to={`/products/update/${product?.id}`}>
              <Button variant="subtle" className="flex justify-center w-40">Edit</Button>
            </Link>
            <Link to="">
              <Button className="flex justify-center w-40" onClick={() => setAddStock(true)}>Add Stock</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Stock History" />
          <Table columns={["Date", "Category", "Quantity", "Balance"]}>
            {productInventory?.map((h, i) => (
              <Tr key={i}>
                <Td className="text-[var(--color-muted)]">{formatBookingDate(h.last_updated)}</Td>
                <Td><Badge>{h.name}</Badge></Td>
                <Td>{h.quantity_in_stock}</Td>
                <Td className="font-medium">{h.quantity_in_stock}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
        {addStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAddStock(false)}>
            <div className="w-full max-w-md rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <SectionTitle title="Add Stock" />
              <form onSubmit={submitStock}>
                <div className="space-y-4">
                  <Input
                    label="Stock Quantity"
                    name="stock_quantity"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="Enter Stock Quantity"
                  />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="ghost" type="button" onClick={() => setAddStock(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
