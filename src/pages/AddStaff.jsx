import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle, Input, Button, Select } from "../components/ui";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { phoneHint } from "../components/format";

export default function AddStaff() {
    const { id } = useParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [basePrice, setBasePrice] = useState("");
    const [monthlySalary, setMonthlySalary] = useState("");
    const { activeLocations, activeLocation, business } = useSession();
    const [locationId, setLocationId] = useState(activeLocation ? String(activeLocation.id) : "");
    const [errors, setErrors] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { fetchWithLoading } = useApi();

    const fetchStaffDetails = useCallback(async () => {
        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/staff/${id}`);
            const data = await response.json();
            setName(data.data.name || "");
            setPhone(data.data.phone || "");
            setEmail(data.data.email || "");
            setRole(data.data.role || "");
            setBasePrice(String(data.data.base_price ?? ""));
        } catch (error) {
            console.error("Error fetching staff details:", error);
        }
    }, [fetchWithLoading, id]);

    useEffect(() => {
        if (location.pathname.includes("/staff/update/")) {
            setIsEditMode(true);
            fetchStaffDetails();
        }
    }, [location.pathname, fetchStaffDetails]);

    const validateForm = () => {
        const nextErrors = {};

        if (!name.trim()) {
            nextErrors.name = "Staff name is required.";
        }

        if (!phone.trim()) {
            nextErrors.phone = "Phone number is required.";
        }

        if (!email.trim()) {
            nextErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nextErrors.email = "Please enter a valid email.";
        }

        if (!role.trim()) {
            nextErrors.role = "Role is required.";
        }

        if (!isEditMode && !locationId) {
            nextErrors.location = "Choose the location they work at.";
        }

        if (monthlySalary !== "" && (Number.isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0)) {
            nextErrors.monthlySalary = "Enter a valid monthly salary.";
        }

        const parsedBasePrice = Number(basePrice);
        if (basePrice === "" || Number.isNaN(parsedBasePrice) || parsedBasePrice <= 0) {
            nextErrors.basePrice = "Please enter a valid base price greater than 0.";
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
            phone: phone.trim(),
            email: email.trim(),
            role: role.trim(),
            base_price: parseFloat(basePrice),
            location_id: Number(locationId),
            ...(monthlySalary !== "" && { monthly_salary: Number(monthlySalary) }),
        };

        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/staff`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) return; // the API layer shows the reason
            navigate("/staff");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to save the staff. Please try again." }));
        }
    };

    const submitUpdateForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            role: role.trim(),
            base_price: parseFloat(basePrice),
        };

        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/staff/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) return; // the API layer shows the reason
            navigate("/staff");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to update the staff. Please try again." }));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between">
                <Link to="/staff" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    <ArrowLeft size={14} /> Back to Staff
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 order-1 lg:order-2">
                    <form onSubmit={isEditMode ? submitUpdateForm : submitForm}>
                        <div className="space-y-4">
                            <SectionTitle title={`${isEditMode ? "Edit" : "Add"} Staff`} />
                            {errors.general && (
                                <div className="rounded-lg border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 p-3 text-[13px] text-[var(--color-red)]">
                                    {errors.general}
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Input label="Name" placeholder="Staff name" name="name" value={name} onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }} />
                                    {errors.name && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.name}</p>}
                                </div>
                                <div>
                                    <Input label="Phone" placeholder={phoneHint()} name="phone" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })); }} />
                                    {errors.phone && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.phone}</p>}
                                </div>
                                <div>
                                    <Input label="Email" placeholder="name@example.com" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }} />
                                    {errors.email && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.email}</p>}
                                </div>
                                <div>
                                    <Input label="Role" placeholder="Role" name="role" value={role} onChange={(e) => { setRole(e.target.value); setErrors((prev) => ({ ...prev, role: undefined })); }} />
                                    {errors.role && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.role}</p>}
                                </div>
                                <div>
                                    <Input label="Base Price" placeholder="0.00" name="base_price" type="number" min="0" step="0.01" value={basePrice} onChange={(e) => { setBasePrice(e.target.value); setErrors((prev) => ({ ...prev, basePrice: undefined })); }} />
                                    {errors.basePrice && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.basePrice}</p>}
                                </div>
                                {!isEditMode && (
                                    <>
                                        <div>
                                            <Select label="Location" value={locationId} onChange={(e) => { setLocationId(e.target.value); setErrors((prev) => ({ ...prev, location: undefined })); }}>
                                                {activeLocations.map((l) => ({ value: String(l.id), label: l.name }))}
                                            </Select>
                                            {errors.location && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.location}</p>}
                                        </div>
                                        <div>
                                            <Input label={`Monthly salary (${business?.currency || "PKR"}, optional)`} placeholder="e.g. 50000" type="number" min="0" step="500" value={monthlySalary} onChange={(e) => { setMonthlySalary(e.target.value); setErrors((prev) => ({ ...prev, monthlySalary: undefined })); }} />
                                            {errors.monthlySalary && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.monthlySalary}</p>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border-soft)]">
                            <Link to="/staff" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors bg-transparent text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/40">
                                Cancel
                            </Link>
                            <Button type="submit">{isEditMode ? "Save" : "Add"} Staff</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
