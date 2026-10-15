import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Card, SectionTitle, Input, Select, Button, Textarea } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";

const generateCategoryOptions = (categories) => {
    if (!categories) return [];
    return categories.map((cat) => ({ value: cat.id, label: cat.name }));
}

export default function AddProduct() {
    const { id } = useParams();
    const [category, setCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [name, setName] = useState('');
    const [unitPrice, setUnitPrice] = useState("");
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState("");
    const [reorderLevel, setReorderLevel] = useState("");
    const [status, setStatus] = useState('Active');
    const [errors, setErrors] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { fetchWithLoading } = useApi();

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/product-category`);
            const categories = await response.json();
            setCategory(categories.data); // Set the first category as the default
            console.log('Fetched Categories:', generateCategoryOptions(categories.data));
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, [fetchWithLoading]);

    const fetchProductDetails = useCallback(async () => {
        try {
            // setIsLoading(true);
            const response = await fetchWithLoading(`${constanst.API_URL}/products/${id}`);
            const data = await response.json();
            // if (data) {
                setCategoryId(String(data.data.product_category_id));
                setDescription(data.data.description);
                setName(data.data.name);
                setUnitPrice(String(data.data.unit_price));
                setReorderLevel(String(data.data.reorder_level));
                setStatus(data.data.is_active ? "Active" : "Inactive");
                // setIsLoading(false);
            // }
        } catch (error) {
            console.error("Error fetching product details:", error);
            setIsLoading(false);
        }
    }, [fetchWithLoading, id]);

    useEffect(() => {
        if (location.pathname.includes("/products/update/")) {
            setIsEditMode(true);
            fetchProductDetails();
            console.log("Edit mode enabled");
        }
        fetchCategories();
    }, [location.pathname, fetchProductDetails, fetchCategories]);

    const submitCategory = async (e) => {
        e.preventDefault();
        const name = newCategoryName.trim();
        if (!name) return;

        try {
            await fetchWithLoading(`${constanst.API_URL}/product-category`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name }),
            });

            setNewCategoryName("");
            setShowCategoryModal(false);
            fetchCategories();
        } catch (error) {
            console.error("Error creating category:", error);
        }
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!name.trim()) {
            nextErrors.name = "Product name is required.";
        }

        const parsedPrice = Number(unitPrice);
        if (unitPrice === "" || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
            nextErrors.unitPrice = "Please enter a valid price greater than 0.";
        }

        if (!categoryId) {
            nextErrors.categoryId = "Please select a product category.";
        }

        if (!description.trim()) {
            nextErrors.description = "Description is required.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submitForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            name: name.trim(),
            unit_price: parseFloat(unitPrice),
            product_category: categoryId,
            description: description.trim(),
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/products`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/products");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to save the product. Please try again." }));
        }
    };

    const submitUpdateForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            name: name.trim(),
            unit_price: parseFloat(unitPrice),
            product_category_id: +categoryId,
            reorder_level: reorderLevel || 0,
            description: description.trim(),
            is_active: status === "Active" ? true : false
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/products/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/products");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to update the product. Please try again." }));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between">
                <Link to="/products" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    <ArrowLeft size={14} /> Back to Products
                </Link>
                {!isEditMode && (<Button type="button" onClick={() => setShowCategoryModal(true)}><Plus size={14} /> Add Product Category</Button>)}
            </div>
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCategoryModal(false)}>
                    <div className="w-full max-w-md rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <SectionTitle title="Add Product Category" />
                        <form onSubmit={submitCategory}>
                            <div className="space-y-4">
                                <Input
                                    label="Category Name"
                                    name="category_name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Enter category name"
                                />
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="ghost" type="button" onClick={() => setShowCategoryModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Submit</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 order-1 lg:order-2">
                    <form onSubmit={isEditMode ? submitUpdateForm : submitForm}>
                        <div className="space-y-4">
                            <SectionTitle title={`${isEditMode ? "Edit" : "Add"} Product`} />
                            {errors.general && (
                                <div className="rounded-lg border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 p-3 text-[13px] text-[var(--color-red)]">
                                    {errors.general}
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Input label="Product Name" placeholder="Product Name" name="name" value={name} onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }} />
                                    {errors.name && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.name}</p>}
                                </div>
                                <div>
                                    <Input label="Unit Price" placeholder="0.00" name="unit_price" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => { setUnitPrice(e.target.value); setErrors((prev) => ({ ...prev, unitPrice: undefined })); }} />
                                    {errors.unitPrice && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.unitPrice}</p>}
                                </div>
                                <div>
                                    <Select label="Product Category" name="product_category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setErrors((prev) => ({ ...prev, categoryId: undefined })); }}>{generateCategoryOptions(category)}</Select>
                                    {errors.categoryId && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.categoryId}</p>}
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    {['Active', 'Inactive'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={(e) => { e.preventDefault(); setStatus(t); }}
                                            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${status === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Textarea label="Description" placeholder="Product description" name="description" rows={4} value={description} onChange={(e) => { setDescription(e.target.value); setErrors((prev) => ({ ...prev, description: undefined })); }} />
                                {errors.description && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.description}</p>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border-soft)]">
                            <Link to="/products" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors bg-transparent text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/40">
                                Cancel
                            </Link>
                            <Button type="submit">{isEditMode ? "Save" : "Add"} Product</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
