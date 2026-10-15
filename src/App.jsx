import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { ApiProvider } from "./context/ApiContext";
import { ToastProvider } from "./context/ToastContext";
import { SessionProvider, useSession } from "./context/SessionContext";
import DetailDrawer from "./components/DetailDrawer";
import { getToken } from "./context/sessionStore";
import { lazy, Suspense, useEffect } from "react";

// Pages load on first visit, so the first screen opens faster (sign-in pages are bundled).
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const NewBooking = lazy(() => import("./pages/NewBooking"));
const AllBookings = lazy(() => import("./pages/AllBookings"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const AddClient = lazy(() => import("./pages/AddClient"));
const Services = lazy(() => import("./pages/Services"));
const Staff = lazy(() => import("./pages/Staff"));
const StaffDetails = lazy(() => import("./pages/StaffDetails"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Reports = lazy(() => import("./pages/Reports"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Settings = lazy(() => import("./pages/Settings"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const AddService = lazy(() => import("./pages/AddService"));
const Account = lazy(() => import("./pages/Account"));
const UnpaidBills = lazy(() => import("./pages/UnpaidBills"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const CloseOut = lazy(() => import("./pages/CloseOut"));
const Packages = lazy(() => import("./pages/Packages"));
const Memberships = lazy(() => import("./pages/Memberships"));
const Automations = lazy(() => import("./pages/Automations"));
const Receipt = lazy(() => import("./pages/Receipt"));
const BookOnline = lazy(() => import("./pages/BookOnline"));
const ManageBooking = lazy(() => import("./pages/ManageBooking"));
const Payroll = lazy(() => import("./pages/Payroll"));
const PayslipDetail = lazy(() => import("./pages/PayslipDetail"));
const Marketing = lazy(() => import("./pages/Marketing"));
const CampaignEditor = lazy(() => import("./pages/CampaignEditor"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CallList = lazy(() => import("./pages/CallList"));
const EmailTemplates = lazy(() => import("./pages/EmailTemplates"));
const EmailTemplateBuilder = lazy(() => import("./pages/EmailTemplateBuilder"));
const AddExpenses = lazy(() => import("./pages/AddExpenses"));
const AddStaff = lazy(() => import("./pages/AddStaff"));
const MessageReminders = lazy(() => import("./pages/MessageReminders"));
const AddMessage = lazy(() => import("./pages/AddMessage"));
const MessageLog = lazy(() => import("./pages/MessageLog"));
const ChoosePlan = lazy(() => import("./pages/ChoosePlan"));
// The platform admin portal (/platform): its own sign-in and frame.
const PlatformLogin = lazy(() => import("./platform/PlatformLogin"));
const PlatformLayout = lazy(() => import("./platform/PlatformLayout"));
const PlatformOverview = lazy(() => import("./platform/PlatformOverview"));
const PlatformBusinesses = lazy(() => import("./platform/PlatformBusinesses"));
const PlatformBusiness = lazy(() => import("./platform/PlatformBusiness"));
const PlatformInvoices = lazy(() => import("./platform/PlatformInvoices"));
const PlatformAdmins = lazy(() => import("./platform/PlatformAdmins"));

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

/** Shown for a moment while a page's code downloads. */
function PageFallback() {
  return <div className="fixed inset-x-0 top-0 z-[60] h-0.5 animate-pulse bg-[var(--color-accent)]" aria-hidden="true" />;
}

/** Detail pages that open in the side drawer when reached from another page. */
function DetailDrawerRoutes() {
  const { terms } = useSession();
  const drawer = (title, page) => <DetailDrawer title={title}>{page}</DetailDrawer>;
  return (
    <Routes>
      <Route path="/bookings/:id" element={drawer(`${terms.booking} details`, <BookingDetails />)} />
      <Route path="/clients/:id" element={drawer(`${terms.client} details`, <ClientDetails />)} />
      <Route path="/staff/:id" element={drawer(`${terms.staff} details`, <StaffDetails />)} />
      <Route path="/products/:id" element={drawer("Product details", <ProductDetails />)} />
      <Route path="/messages/:id" element={drawer("Message details", <MessageLog />)} />
      <Route path="/payroll/payslips/:id" element={drawer("Payslip", <PayslipDetail />)} />
      <Route path="/marketing/campaigns/:id" element={drawer("Campaign", <CampaignDetail />)} />
    </Routes>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  // Set by DetailLink: the page a detail was opened from. When present, that page keeps
  // rendering underneath and the detail opens in a drawer; direct visits show the full page.
  const background = location.state?.background;

  useEffect(() => {
    if (!getToken() && !PUBLIC_PATHS.includes(pathname) && !pathname.startsWith("/book/") && !pathname.startsWith("/manage/") && !pathname.startsWith("/platform")) {
      navigate('/login');
    }
  }, [navigate, pathname]);
  return (
    <ToastProvider>
      <SessionProvider>
        <ApiProvider>
        <Suspense fallback={<PageFallback />}>
        <Routes location={background || location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/receipt/:id" element={<Receipt />} />
          <Route path="/book/:slug" element={<BookOnline />} />
          <Route path="/manage/:token" element={<ManageBooking />} />
          <Route path="/choose-plan" element={<ChoosePlan />} />
          <Route path="/platform/login" element={<PlatformLogin />} />
          <Route path="/platform" element={<PlatformLayout />}>
            <Route index element={<PlatformOverview />} />
            <Route path="businesses" element={<PlatformBusinesses />} />
            <Route path="businesses/:id" element={<PlatformBusiness />} />
            <Route path="invoices" element={<PlatformInvoices />} />
            <Route path="admins" element={<PlatformAdmins />} />
          </Route>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/new-booking" element={<NewBooking />} />
            <Route path="/bookings" element={<AllBookings />} />
            <Route path="/bookings/:id" element={<BookingDetails />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/new" element={<AddClient />} />
            <Route path="/clients/update/:id" element={<AddClient />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/new" element={<AddService />} />
            <Route path="/services/update/:id" element={<AddService />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/new" element={<AddStaff />} />
            <Route path="/staff/:id" element={<StaffDetails />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/update/:id" element={<AddProduct />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<AddExpenses />} />
            <Route path="/expenses/update/:id" element={<AddExpenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/account" element={<Account />} />
            <Route path="/bills/unpaid" element={<UnpaidBills />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/close-out" element={<CloseOut />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/memberships" element={<Memberships />} />
            <Route path="/messages" element={<MessageReminders />} />
            <Route path="/messages/new" element={<AddMessage />} />
            <Route path="/messages/:id" element={<MessageLog />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll/payslips/:id" element={<PayslipDetail />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/marketing/new" element={<CampaignEditor />} />
            <Route path="/marketing/calls" element={<CallList />} />
            <Route path="/marketing/automations" element={<Automations />} />
            <Route path="/marketing/email-templates" element={<EmailTemplates />} />
            <Route path="/marketing/email-templates/new" element={<EmailTemplateBuilder />} />
            <Route path="/marketing/email-templates/:id" element={<EmailTemplateBuilder />} />
            <Route path="/marketing/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/marketing/campaigns/:id/edit" element={<CampaignEditor />} />
          </Route>
        </Routes>
        {background && <DetailDrawerRoutes />}
        </Suspense>
        </ApiProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
