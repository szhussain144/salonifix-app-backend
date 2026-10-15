export const clients = [
  { id: 1, name: "Ali Raza", phone: "0312 6459178", visits: 12, spend: 15400, lastVisit: "14 May 2025", initials: "AR" },
  { id: 2, name: "Usman Khan", phone: "0301 1234567", visits: 8, spend: 8600, lastVisit: "12 May 2025", initials: "UK" },
  { id: 3, name: "Bilal Ahmed", phone: "0345 8901234", visits: 5, spend: 6100, lastVisit: "10 May 2025", initials: "BA" },
  { id: 4, name: "Zain Ul Abedin", phone: "0321 4455667", visits: 3, spend: 4500, lastVisit: "08 May 2025", initials: "ZA" },
  { id: 5, name: "Hamza Malik", phone: "0300 7788990", visits: 4, spend: 7800, lastVisit: "05 May 2025", initials: "HM" },
  { id: 6, name: "Hassan Ali", phone: "0333 2211445", visits: 6, spend: 5200, lastVisit: "02 May 2025", initials: "HA" },
];

export const clientDetails = {
  name: "Ali Raza",
  phone: "0312 6459178",
  email: "aliraza@example.com",
  since: "12 Jan 2022",
  visits: 12,
  totalSpend: 15400,
  history: [
    { date: "14 May 2025", service: "Hair Cut, Beard Trim", staff: "Ahmed", amount: 1200, status: "Completed" },
    { date: "29 Apr 2025", service: "Hair Spa", staff: "Bilal", amount: 3000, status: "Completed" },
    { date: "16 Apr 2025", service: "Hair Color", staff: "Usman", amount: 3500, status: "Completed" },
    { date: "30 Mar 2025", service: "Hair Cut", staff: "Ahmed", amount: 800, status: "Cancelled" },
  ],
};

export const services = [
  { id: 1, name: "Hair Cut", category: "Hair", price: 800, duration: "30 min", status: "Active" },
  { id: 2, name: "Beard Trim", category: "Beard", price: 300, duration: "15 min", status: "Active" },
  { id: 3, name: "Hair Cut, Beard Trim", category: "Combo", price: 1200, duration: "45 min", status: "Active" },
  { id: 4, name: "Hair Color", category: "Hair", price: 2000, duration: "60 min", status: "Active" },
  { id: 5, name: "Hair Spa", category: "Hair", price: 1500, duration: "60 min", status: "Active" },
  { id: 6, name: "Facial", category: "Skin", price: 1800, duration: "45 min", status: "Active" },
];

export const staff = [
  { id: 1, name: "Ahmed", role: "Barber", price: "PKR 800", rating: "4.9", completion: "95%", status: "Active" },
  { id: 2, name: "Bilal", role: "Hair Stylist", price: "PKR 1,200", rating: "4.5", completion: "90%", status: "Active" },
  { id: 3, name: "Hassan", role: "Hair Stylist", price: "PKR 1,000", rating: "4.3", completion: "85%", status: "Active" },
  { id: 4, name: "Usman", role: "Barber", price: "PKR 900", rating: "4.2", completion: "88%", status: "Active" },
  { id: 5, name: "Zeeshan", role: "Colorist", price: "PKR 2,000", rating: "4.4", completion: "90%", status: "Active" },
  { id: 6, name: "Shadi", role: "Spa Specialist", price: "PKR 1,500", rating: "3.9", completion: "80%", status: "Active" },
];

export const staffDetail = {
  name: "Ahmed",
  role: "Barber",
  phone: "0312 3456789",
  email: "ahmed@waseemsalon.com",
  joined: "12 Jun 2022",
  totalBookings: 198,
  completed: 142,
  completion: "60%",
};

export const products = [
  { id: 1, name: "Hair Wax", category: "Styling", stock: 24, price: 500, status: "In Stock" },
  { id: 2, name: "Shampoo", category: "Hair Care", stock: 15, price: 830, status: "In Stock" },
  { id: 3, name: "Conditioner", category: "Hair Care", stock: 10, price: 700, status: "Low Stock" },
  { id: 4, name: "Hair Oil", category: "Hair Care", stock: 10, price: 600, status: "In Stock" },
  { id: 5, name: "Beard Oil", category: "Beard Care", stock: 8, price: 550, status: "Low Stock" },
  { id: 6, name: "Hair Serum", category: "Hair Care", stock: 5, price: 950, status: "Low Stock" },
];

export const productDetail = {
  name: "Hair Wax",
  stock: 24,
  price: 500,
  status: "In Stock",
  brand: "Waseem Salon",
  supplier: "ABC Traders",
  purchasePrice: 300,
  description: "Strong hold hair wax for all hair types",
  history: [
    { date: "14 May 2025", type: "Sold", qty: 2, balance: 24 },
    { date: "10 May 2025", type: "Restock", qty: 20, balance: 26 },
    { date: "01 May 2025", type: "Sold", qty: 3, balance: 6 },
  ],
};

export const expenses = [
  { id: 1, category: "Rent", amount: 25000, date: "01 May 2025" },
  { id: 2, category: "Electricity Bill", amount: 6300, date: "03 May 2025" },
  { id: 3, category: "Staff Salary", amount: 40000, date: "01 May 2025" },
  { id: 4, category: "Products Purchase", amount: 18900, date: "05 May 2025" },
  { id: 5, category: "Water Bill", amount: 1800, date: "03 May 2025" },
  { id: 6, category: "Internet Bill", amount: 2500, date: "02 May 2025" },
];

export const bookings = [
  { id: 1, client: "Usman Khan", service: "Hair Cut", time: "10:00 AM", staff: "Ahmed", amount: 800, status: "Confirmed" },
  { id: 2, client: "Ali Raza", service: "Hair Cut, Beard Trim", time: "11:30 AM", staff: "Bilal", amount: 1200, status: "Confirmed" },
  { id: 3, client: "Hassan Ali", service: "Hair Color", time: "01:00 PM", staff: "Usman", amount: 2000, status: "Confirmed" },
  { id: 4, client: "Bilal Ahmed", service: "Hair Spa", time: "02:30 PM", staff: "Zeeshan", amount: 1500, status: "Walk-in Client" },
  { id: 5, client: "Zain Ul Abedin", service: "Facial", time: "04:00 PM", staff: "Shadi", amount: 1800, status: "Upcoming" },
];

export const allBookings = [
  { id: 1, client: "Usman Khan", phone: "0301 1234567", date: "14 May 2025, 10:00 AM", service: "Hair Cut", amount: 800, status: "Confirmed" },
  { id: 2, client: "Ali Raza", phone: "0312 6459178", date: "14 May 2025, 11:30 AM", service: "Hair Cut, Beard Trim", amount: 1200, status: "Confirmed" },
  { id: 3, client: "Hassan Ali", phone: "0333 2211445", date: "14 May 2025, 01:00 PM", service: "Hair Color", amount: 2000, status: "Confirmed" },
  { id: 4, client: "Bilal Ahmed", phone: "0345 8901234", date: "14 May 2025, 04:30 PM", service: "Hair Spa", amount: 1500, status: "Upcoming" },
  { id: 5, client: "Zain Ul Abedin", phone: "0321 4455667", date: "15 May 2025, 10:00 AM", service: "Beard Trim", amount: 300, status: "Upcoming" },
  { id: 6, client: "Hamza Malik", phone: "0300 7788990", date: "13 May 2025, 03:00 PM", service: "Facial", amount: 1800, status: "Completed" },
];

export const topServices = [
  { name: "Hair Cut, Beard Trim", bookings: 34, revenue: 86200 },
  { name: "Hair Color", bookings: 22, revenue: 54000 },
  { name: "Hair Spa", bookings: 18, revenue: 43000 },
];

export const paymentMethods = [
  { name: "Cash", value: 65, color: "var(--color-green)" },
  { name: "Card", value: 25, color: "var(--color-gold)" },
  { name: "Online", value: 10, color: "var(--color-red)" },
];

export const staffPerformance = [
  { staff: "Ahmed", bookings: 86, revenue: 96500, commission: 21900 },
  { staff: "Bilal", bookings: 44, revenue: 62100, commission: 34285 },
  { staff: "Hassan", bookings: 38, revenue: 49820, commission: 21390 },
  { staff: "Usman", bookings: 24, revenue: 28700, commission: 14300 },
  { staff: "Zeeshan", bookings: 12, revenue: 15200, commission: 6120 },
];

export const revenueTrend = [
  { day: "2026-08-09", revenue: 22000 },
  { day: "2026-08-10", revenue: 0 },
  { day: "2026-08-11", revenue: 0 },
  { day: "2026-08-12", revenue: 24800 },
  { day: "2026-08-13", revenue: 0 },
  { day: "2026-08-14", revenue: 0 },
  { day: "2026-08-15", revenue: 0 },
];

export const lowStockItems = [
  { name: "Hair Oil", stock: 10, reorder: 15 },
  { name: "Hair Serum", stock: 5, reorder: 15 },
  { name: "Beard Oil", stock: 8, reorder: 12 },
  { name: "Conditioner", stock: 10, reorder: 25 },
];

export const monthLabel = "May 2025";
export const todayLabel = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
