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
  phone?: string;
  passportNumber?: string;
  passportExpiry?: string | null;
  visaStatus?: string;
  visaExpiry?: string | null;
  iqamaNumber?: string;
  iqamaExpiry?: string | null;
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
  cardAccount: "stc" | "anb" | null;
  cashReceived: number;
  balanceSettledByStaff: boolean;
  settledFromStaff: number;
  settledFromDrawer: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  orderStatus: "active" | "void";
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
  assignedStaffId: number | null;
  assignedStaffName: string;
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

export type PermissionRequest = {
  id: number;
  staffUserId: number;
  staffName: string;
  task: "collection_read" | "order_update" | "expense_update";
  resourceType: "collection_date" | "order" | "expense";
  resourceId: string;
  reason: string;
  status: "pending" | "approved" | "denied" | "revoked";
  reviewedByName?: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type PasswordResetRequest = {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  status: "pending" | "completed" | "denied";
  requestedAt: string;
  completedAt: string | null;
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
  staffUsers: User[];
  admin?: {
    users: User[];
    grants: PermissionGrant[];
    permissionRequests: PermissionRequest[];
    passwordResetRequests: PasswordResetRequest[];
    categoryCount: number;
    serviceCount: number;
    customerCount: number;
    staffDebts: StaffDebt[];
  };
};

export type StaffDebt = {
  id: number;
  staffUserId: number;
  staffName: string;
  orderId: number;
  tokenNumber: string;
  invoiceNumber: string;
  originalAmount: number;
  outstandingAmount: number;
  status: "open" | "settled" | "void";
  notes: string;
  createdAt: string;
  settledAt: string | null;
};

export type CartItem = {
  serviceId: number;
  categoryName: string;
  categoryColor: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
};
