import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle, Input, Button } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";

export default function AddExpenses() {
    const { id } = useParams();
    const [category, setCategory] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [expenseType, setExpenseType] = useState('Monthly');
    const [amount, setAmount] = useState("");
    const [errors, setErrors] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { fetchWithLoading } = useApi();


    const fetchExpensesDetails = useCallback(async () => {
        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/expenses/${id}`);
            const data = await response.json();
            setCategory(data.data.category);
            setExpenseType(data.data.expense_type);
            setAmount(String(data.data.amount));
        } catch (error) {
            console.error("Error fetching product details:", error);
        }
    }, [fetchWithLoading, id]);

    useEffect(() => {
        if (location.pathname.includes("/expenses/update/")) {
            setIsEditMode(true);
            fetchExpensesDetails();
            console.log("Edit mode enabled");
        }
    }, [location.pathname, fetchExpensesDetails]);

    const validateForm = () => {
        const nextErrors = {};

        if (!category?.trim()) {
            nextErrors.category = "Category is required.";
        }

        const parsedAmount = Number(amount);
        if (amount === "" || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            nextErrors.amount = "Please enter a valid amount greater than 0.";
        }

        if (!expenseType) {
            nextErrors.expenseType = "Please select an expense type.";
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
            category: category.trim(),
            amount: parseFloat(amount),
            expense_type: expenseType
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/expenses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/expenses");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to save the expense. Please try again." }));
        }
    };

    const submitUpdateForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            category: category.trim(),
            amount: parseFloat(amount),
            expense_type: expenseType
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/expenses/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/expenses");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to update the expense. Please try again." }));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between">
                <Link to="/expenses" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    <ArrowLeft size={14} /> Back to Expenses
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 order-1 lg:order-2">
                    <form onSubmit={isEditMode ? submitUpdateForm : submitForm}>
                        <div className="space-y-4">
                            <SectionTitle title={`${isEditMode ? "Edit" : "Add"} Expense`} />
                            {errors.general && (
                                <div className="rounded-lg border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 p-3 text-[13px] text-[var(--color-red)]">
                                    {errors.general}
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Input label="Category" placeholder="Category" name="category" value={category} onChange={(e) => { setCategory(e.target.value); setErrors((prev) => ({ ...prev, category: undefined })); }} />
                                    {errors.category && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.category}</p>}
                                </div>
                                <div>
                                    <Input label="Amount" placeholder="0.00" name="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors((prev) => ({ ...prev, amount: undefined })); }} />
                                    {errors.amount && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.amount}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border-soft)]">
                            <Link to="/expenses" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors bg-transparent text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/40">
                                Cancel
                            </Link>
                            <Button type="submit">{isEditMode ? "Save" : "Add"} Expense</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
