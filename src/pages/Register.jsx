import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CalendarCheck, MapPin, Users } from "lucide-react";
import { Card, Button, Input, Select } from "../components/ui";
import Mark from "../components/Mark";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";
import { guessCountry, useRegions } from "../components/regions";

const HIGHLIGHTS = [
  { icon: Building2, name: "Any appointment business", intro: "Salons, barbers, spas, clinics and more." },
  { icon: MapPin, name: "Every branch", intro: "Add locations and switch between them." },
  { icon: CalendarCheck, name: "No double bookings", intro: "Staff can't be booked twice at once." },
  { icon: Users, name: "Your team", intro: "Invite admins and front-desk staff." },
];

const EMPTY = {
  business_name: "",
  industry: "",
  owner_name: "",
  email: "",
  password: "",
  phone: "",
  location_name: "",
  country: "",
};

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [industries, setIndustries] = useState([]);
  const { fetchWithLoading } = useApi();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const regions = useRegions();
  const country = regions?.countries.find((c) => c.code === form.country);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // The browser's own zone when it's in the chosen country, else the country's main zone.
  const zone = country?.time_zones.includes(browserZone) ? browserZone : country?.time_zones[0];

  useEffect(() => {
    if (regions?.countries.length) setForm((prev) => (prev.country ? prev : { ...prev, country: guessCountry(regions.countries) || regions.default_country }));
  }, [regions]);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/business/templates`)
      .then((res) => res.json())
      .then((data) => setIndustries(data.data || []))
      .catch(() => setIndustries([]));
  }, [fetchWithLoading]);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.business_name.trim()) next.business_name = "Business name is required.";
    if (!form.industry) next.industry = "Choose your industry.";
    if (!form.owner_name.trim()) next.owner_name = "Your name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (!form.country) next.country = "Choose your country.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ""),
    );
    payload.password = form.password;
    if (zone) payload.timezone = zone;

    const response = await fetchWithLoading(`${constanst.API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return; // the API layer already showed the reason

    signIn(await response.json());
    // Next: start the free trial (picked by default) or choose a plan. That page welcomes them.
    navigate("/choose-plan");
  };

  const fieldError = (field) =>
    errors[field] && <p className="mt-1 text-[12px] text-[var(--color-red)]">{errors[field]}</p>;

  return (
    <div className="wash min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-10">
      <div className="page-enter grid w-full max-w-5xl gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="banner relative hidden overflow-hidden rounded-[var(--radius-card)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-2 text-[var(--color-navy-accent)]">
            <Mark size={24} />
            <span className="font-display text-[16px] font-semibold text-[var(--color-navy-ink)]">Salonifix</span>
          </div>
          <div className="my-10">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-navy-accent)]">Get started</p>
            <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-tight">Set up your business in a minute.</h1>
            <p className="mt-4 max-w-sm text-[15px] text-[var(--color-navy-ink-2)]">
              We pre-fill a starter service menu for your industry. You can change everything later.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, name, intro }) => (
              <li key={name} className="rounded-xl border border-white/12 bg-white/8 p-3.5 backdrop-blur">
                <Icon size={16} className="mb-2 text-[var(--color-navy-accent)]" />
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-navy-ink-2)]">{intro}</p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="p-8 sm:p-10 self-center">
          <div className="mb-7">
            <div className="mb-6 flex items-center gap-2 text-[var(--color-accent)] lg:hidden">
              <Mark size={22} />
              <span className="font-display text-[15px] font-semibold text-[var(--color-ink)]">Salonifix</span>
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">Create account</p>
            <h2 className="font-display text-[30px] font-medium leading-tight">Create your business</h2>
            <p className="mt-2 text-[14px] text-[var(--color-muted)]">You&apos;ll be the owner and can invite your team afterwards.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Business name" placeholder="e.g. Waseem Salon" value={form.business_name} onChange={update("business_name")} />
                {fieldError("business_name")}
              </div>
              <div>
                <Select label="Industry" value={form.industry} onChange={update("industry")}>
                  {industries.map((t) => ({ value: t.key, label: t.label }))}
                </Select>
                {fieldError("industry")}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Your name" placeholder="Full name" value={form.owner_name} onChange={update("owner_name")} />
                {fieldError("owner_name")}
              </div>
              <Input label="Phone (optional)" placeholder={country ? (country.code === "PK" ? "0300-1234567" : `+${country.dial_code} …`) : ""} value={form.phone} onChange={update("phone")} />
            </div>
            <div>
              <Select label="Country" value={form.country} onChange={update("country")}>
                {(regions?.countries || []).map((c) => ({ value: c.code, label: c.name }))}
              </Select>
              {fieldError("country")}
              {country && (
                <p className="mt-1 text-[12px] text-[var(--color-faint)]">
                  Prices in {country.currency}{zone ? `, ${zone.replace(/_/g, " ")} time` : ""}, phone numbers +{country.dial_code}. You can change these in Settings.
                </p>
              )}
            </div>
            <div>
              <Input label="Email" type="email" placeholder="you@yourbusiness.com" value={form.email} onChange={update("email")} />
              {fieldError("email")}
            </div>
            <div>
              <Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={update("password")} />
              {fieldError("password")}
            </div>
            <Input
              label="First location (optional)"
              placeholder="e.g. Gulberg branch — defaults to “Main branch”"
              value={form.location_name}
              onChange={update("location_name")}
            />
            <Button type="submit" className="w-full py-3 text-[14px]">Create business</Button>
          </form>

          <div className="mt-6 text-[13px] text-[var(--color-muted)]">
            Already have an account? <Link to="/login" className="font-medium text-[var(--color-accent)] hover:underline">Sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
