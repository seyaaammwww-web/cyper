import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const pcs = pgTable('pcs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  zone: text('zone').notNull().default('standard'),
  ipAddress: text('ipAddress').notNull().default(''),
  hourlyRate: numeric('hourlyRate', { precision: 10, scale: 2 })
    .notNull()
    .default('40'),
  status: text('status').notNull().default('available'),
  locked: boolean('locked').notNull().default(false),
  maintenance: boolean('maintenance').notNull().default(false),
  mapCol: text('mapCol').notNull().default('a'),
  slotIndex: integer('slotIndex').notNull().default(0),
  lastHeartbeat: timestamp('lastHeartbeat', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  pcId: integer('pcId').notNull(),
  customerId: integer('customerId'),
  startTime: timestamp('startTime', { withTimezone: true })
    .notNull()
    .defaultNow(),
  endTime: timestamp('endTime', { withTimezone: true }),
  offlineSeconds: integer('offlineSeconds').notNull().default(0),
  status: text('status').notNull().default('active'),
  timeCost: numeric('timeCost', { precision: 10, scale: 2 }),
  snackCost: numeric('snackCost', { precision: 10, scale: 2 }),
  discountPercent: numeric('discountPercent', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  billableSeconds: integer('billableSeconds'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const snackOrders = pgTable('snack_orders', {
  id: serial('id').primaryKey(),
  pcId: integer('pcId').notNull(),
  sessionId: integer('sessionId').notNull(),
  snackId: integer('snackId'),
  itemName: text('itemName').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unitPrice', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const snacks = pgTable('snacks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  lowStockThreshold: integer('lowStockThreshold').notNull().default(5),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  notes: text('notes'),
  prepaidBalance: numeric('prepaidBalance', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  loyaltyPoints: integer('loyaltyPoints').notNull().default(0),
  totalSpent: numeric('totalSpent', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  visitCount: integer('visitCount').notNull().default(0),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  pcId: integer('pcId').notNull(),
  customerId: integer('customerId'),
  customerName: text('customerName').notNull(),
  startAt: timestamp('startAt', { withTimezone: true }).notNull(),
  durationMinutes: integer('durationMinutes').notNull().default(60),
  status: text('status').notNull().default('upcoming'),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  pcId: integer('pcId'),
  category: text('category').notNull().default('control'),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const cafeSettings = pgTable('cafe_settings', {
  id: integer('id').primaryKey().default(1),
  cafeName: text('cafeName').notNull().default('Cyper Gaming Cafe'),
  currency: text('currency').notNull().default('EGP'),
  offlineGraceSeconds: integer('offlineGraceSeconds').notNull().default(300),
  minimumSessionMinutes: integer('minimumSessionMinutes').notNull().default(15),
  billingRounding: text('billingRounding').notNull().default('5min'),
  taxPercent: numeric('taxPercent', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  happyHourEnabled: boolean('happyHourEnabled').notNull().default(false),
  happyHourStart: integer('happyHourStart').notNull().default(14),
  happyHourEnd: integer('happyHourEnd').notNull().default(17),
  happyHourDiscountPercent: numeric('happyHourDiscountPercent', {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default('20'),
  loyaltyPointsPerCurrency: numeric('loyaltyPointsPerCurrency', {
    precision: 6,
    scale: 3,
  })
    .notNull()
    .default('0.1'),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
