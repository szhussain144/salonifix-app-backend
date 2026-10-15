import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, SectionTitle, Select, Button, Textarea } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";

export default function AddMessage() {
    const { id } = useParams();
    const [isEditMode, setIsEditMode] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [status, setStatus] = useState("");
    const [errors, setErrors] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { fetchWithLoading } = useApi();

    const fetchStaffDetails = useCallback(async () => {
        try {
            const response = await fetchWithLoading(`${constanst.API_URL}/messages/${id}`);
            const data = await response.json();
            setMessage(data.data.message || "");
            setMessageType(data.data.messageType || "");
            setStatus(data.data.status || "");
            setRole(data.data.role || "");
            setBasePrice(String(data.data.base_price ?? ""));
        } catch (error) {
            console.error("Error fetching messages details:", error);
        }
    }, [fetchWithLoading, id]);

    useEffect(() => {
        if (location.pathname.includes("/messages/update/")) {
            setIsEditMode(true);
            fetchStaffDetails();
        }
    }, [location.pathname, fetchStaffDetails]);

    const validateForm = () => {
        const nextErrors = {};

        if (!message.trim()) {
            nextErrors.message = "Messages message is required.";
        }

        if (!messageType.trim()) {
            nextErrors.messageType = "Phone number is required.";
        }

        if (!status.trim()) {
            nextErrors.status = "status is required.";
        } 
        // else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(status)) {
        //     nextErrors.status = "Please enter a valid status.";
        // }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submitForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            message: message.trim(),
            message_type: messageType.trim(),
            status: status.trim()
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/messages");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to save the messages. Please try again." }));
        }
    };

    const submitUpdateForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {
            message: message.trim(),
            message_type: messageType.trim(),
            status: status.trim(),
        };

        try {
            await fetchWithLoading(`${constanst.API_URL}/messages/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            navigate("/messages");
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors((prev) => ({ ...prev, general: "Unable to update the messages. Please try again." }));
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between">
                <Link to="/messages" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    <ArrowLeft size={14} /> Back to Messages
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 order-1 lg:order-2">
                    <form onSubmit={isEditMode ? submitUpdateForm : submitForm}>
                        <div className="space-y-4">
                            <SectionTitle title={`${isEditMode ? "Edit" : "Add"} Message`} />
                            {errors.general && (
                                <div className="rounded-lg border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 p-3 text-[13px] text-[var(--color-red)]">
                                    {errors.general}
                                </div>
                            )}
                            <div>
                                <Textarea label="Message" placeholder="Messages message" message="message" value={message} onChange={(e) => { setMessage(e.target.value); setErrors((prev) => ({ ...prev, message: undefined })); }} />
                                {errors.message && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.message}</p>}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Select
                                        value={messageType}
                                        onChange={(e) => { setMessageType(e.target.value); setErrors((prev) => ({ ...prev, messageType: undefined })); }}
                                        className="w-full"
                                    >
                                        {["transactional","reminder"].map((s) => (
                                            { value: s, label: s.toLocaleUpperCase() }
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    {['Active', 'Inactive'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={(e) => { e.preventDefault(); setStatus(t); setErrors((prev) => ({ ...prev, status: undefined })); }}
                                            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${status === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                    {/* <Input label="status" placeholder="message@example.com" message="status" type="status" value={status} onChange={(e) => { setStatus(e.target.value); setErrors((prev) => ({ ...prev, status: undefined })); }} /> */}
                                    {errors.status && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.status}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border-soft)]">
                            <Link to="/messages" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors bg-transparent text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/40">
                                Cancel
                            </Link>
                            <Button type="submit">{isEditMode ? "Save" : "Add"} Messages</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
