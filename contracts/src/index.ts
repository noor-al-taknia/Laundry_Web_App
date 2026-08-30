export type Role = "admin" | "staff";
export type PortalRole = "super_admin" | "admin" | "office_staff";

export type User = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  portalRole: PortalRole;
  mustChangePassword: boolean;
  isActive?: boolean;
  createdAt?: string;
};

export type Shop = {
  shopName: string;
  shopNameAr: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  commercialNumber: string;
  invoicePrefix: string;
  receiptFooter: string;
};

export type Service = {
  id: number;
  name: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
  priceId: number | null;
  price: number;
  effectiveFrom: string | null;
};

export type Category = {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  services: Service[];
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  vatNumber: string;
  notes: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = {
  id: number;
  invoiceNumber: string;
  tokenNumber: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  orderDate: string;
  supplyDate: string;
  paymentMethod: "cash" | "card";
  paymentStatus: "paid" | "unpaid" | "partial";
  subtotal: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  notes: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
};

export type OrderItem = {
  id?: number;
  serviceId: number | null;
  categoryName: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export type OrderDetail = {
  order: Order;
  items: OrderItem[];
  events: Array<{
    id: number;
    eventType: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    actorName: string;
  }>;
};

export type Expense = {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: "cash" | "card" | "bank";
  vendor: string;
  receiptReference: string;
  notes: string;
  status: "posted" | "void";
  version: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type Summary = {
  orderCount: number;
  grossSales: number;
  collected: number;
  outstanding: number;
  cashCollected: number;
  cardCollected: number;
};

export type PermissionGrant = {
  id: number;
  staffUserId: number;
  staffName: string;
  scope: "reports_history" | "orders_history_write";
  fromDate: string;
  toDate: string;
  expiresAt: string | null;
  createdAt: string;
};

export type BootstrapData = {
  user: User;
  shop: Shop;
  catalog: Category[];
  customers: Customer[];
  recentOrders: Order[];
  reportRange: { from: string; to: string };
  reportTotal: number;
  reportSummary: { orders: number; sales: number; collected: number; balance: number };
  todaySummary: Summary;
  admin?: {
    users: User[];
    grants: PermissionGrant[];
    categoryCount: number;
    serviceCount: number;
    customerCount: number;
  };
};

export type CartItem = {
  serviceId: number;
  categoryName: string;
  categoryColor: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
};
