import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle, Input, Button, Textarea } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { phoneHint } from "../components/format";

export default function AddClient() {
    const { id } = useParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [discount, setDiscount] = useState("");
    const [birthday, setBirthday] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { fetchWithLoading } = useApi();

    const fetchClientDetails = useCallback(async () => {
        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/clients/${id}`);
            const data = await response.json();
            setName(data.data.name || "");
            setPhone(data.data.phone || "");
            setEmail(data.data.email || "");
            setDiscount(String(data.data.discount ?? ""));
            setBirthday(data.data.birthday || "");
            setNotes(data.data.notes || "");
        } catch (error) {
            console.error("Error fetching client details:", error);
        }
    }, [fetchWithLoading, id]);

    useEffect(() => {
        if (location.pathname.includes("/clients/update/")) {
            setIsEditMode(true);
            fetchClientDetails();
        }
    }, [location.pathname, fetchClientDetails]);

    const validateForm = () => {
        const nextErrors = {};

        if (!name.trim()) {
            nextErrors.name = "Client name is required.";
        }

        if (!phone.trim()) {
            nextErrors.phone = "Phone number is required.";
        }

        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nextErrors.email = "Please enter a valid email.";
        }

        if (discount !== "") {
            const parsedDiscount = Number(discount);
            if (Number.isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
                nextErrors.discount = "Please enter a valid discount between 0 and 100.";
            }
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const buildPayload = () => ({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        discount: discount === "" ? 0 : Number(discount),
        birthday: birthday || "",
        notes: notes.trim(),
    });

    const submitForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await fetchWithLoading(`${constanst.API_URL}/clients`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(buildPayload())
            });
            navigate("/clients");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to save the client. Please try again." }));
        }
    };

    const submitUpdateForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await fetchWithLoading(`${constanst.API_URL}/clients/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(buildPayload())
            });
            navigate(`/clients/${id}`);
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to update the client. Please try again." }));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between">
                <Link to="/clients" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    <ArrowLeft size={14} /> Back to Clients
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 order-1 lg:order-2">
                    <form onSubmit={isEditMode ? submitUpdateForm : submitForm}>
                        <div className="space-y-4">
                            <SectionTitle title={`${isEditMode ? "Edit" : "Add"} Client`} />
                            {errors.general && (
                                <div className="rounded-lg border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 p-3 text-[13px] text-[var(--color-red)]">
                                    {errors.general}
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Input label="Name" placeholder="Client name" name="name" value={name} onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }} />
                                    {errors.name && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.name}</p>}
                                </div>
                                <div>
                                    <Input label="Phone" placeholder={phoneHint()} name="phone" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })); }} />
                                    {errors.phone && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.phone}</p>}
                                </div>
                                <div>
                                    <Input label="Email (optional)" placeholder="name@example.com" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }} />
                                    {errors.email && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.email}</p>}
                                </div>
                                <div>
                                    <Input label="Discount (%)" placeholder="0" name="discount" type="number" min="0" max="100" step="0.01" value={discount} onChange={(e) => { setDiscount(e.target.value); setErrors((prev) => ({ ...prev, discount: undefined })); }} />
                                    {errors.discount && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.discount}</p>}
                                </div>
                                <div>
                                    <Input label="Birthday (optional)" name="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                                    <p className="mt-1.5 text-[11.5px] text-[var(--color-faint)]">For a birthday message (Marketing → Automations).</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <Textarea label="Notes for staff (optional)" name="notes" rows={3} placeholder="Allergies, sensitive skin, colour formula, preferences…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border-soft)]">
                            <Link to="/clients" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors bg-transparent text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/40">
                                Cancel
                            </Link>
                            <Button type="submit">{isEditMode ? "Save" : "Add"} Client</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
