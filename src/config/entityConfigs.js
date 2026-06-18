// Declarative config consumed by ResourcePage.jsx so 12 of the 16 feature
// tables share one generic list+form implementation instead of 12 near-duplicates.
// field.type: text | textarea | number | date | select | relation | boolean | file

export const motorcycleConfig = {
  table: 'motorcycles',
  select: '*',
  titleSingular: 'Motorcycle',
  titlePlural: 'Motorcycles',
  searchKeys: ['plate_number', 'brand', 'model'],
  columns: [
    { key: 'plate_number', label: 'Plate', plate: true },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'daily_target', label: 'Daily target', money: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'plate_number', label: 'Plate number', type: 'text', required: true },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'engine_number', label: 'Engine number', type: 'text' },
    { key: 'chassis_number', label: 'Chassis number', type: 'text' },
    { key: 'motorcycle_phone', label: 'Motorcycle phone', type: 'text' },
    { key: 'purchase_price', label: 'Purchase price (RWF)', type: 'number' },
    { key: 'purchase_date', label: 'Purchase date', type: 'date' },
    { key: 'daily_target', label: 'Daily target (RWF)', type: 'number', default: 6000 },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'garage', 'maintenance', 'sold'], default: 'active' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ]
}

export const driverConfig = {
  table: 'drivers',
  select: '*',
  titleSingular: 'Driver',
  titlePlural: 'Drivers',
  searchKeys: ['full_name', 'phone_number', 'national_id'],
  columns: [
    { key: 'full_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'national_id', label: 'National ID' },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'full_name', label: 'Full name', type: 'text', required: true },
    { key: 'national_id', label: 'National ID', type: 'text' },
    { key: 'phone_number', label: 'Phone number', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'emergency_contact', label: 'Emergency contact', type: 'text' },
    { key: 'photo_url', label: 'Photo', type: 'file', folder: 'drivers' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], default: 'active' }
  ]
}

export const assignmentConfig = {
  table: 'driver_assignments',
  select: '*, motorcycles(plate_number), drivers(full_name)',
  titleSingular: 'Assignment',
  titlePlural: 'Driver Assignments',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'drivers.full_name', label: 'Driver' },
    { key: 'assigned_date', label: 'Assigned', date: true },
    { key: 'end_date', label: 'Ended', date: true },
    { key: 'is_active', label: 'Active', boolean: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'driver_id', label: 'Driver', type: 'relation', relation: { table: 'drivers', labelKey: 'full_name' }, required: true },
    { key: 'assigned_date', label: 'Assigned date', type: 'date', default: 'today' },
    { key: 'end_date', label: 'End date', type: 'date' },
    { key: 'is_active', label: 'Currently active', type: 'boolean', default: true }
  ]
}

export const expenseConfig = {
  table: 'expenses',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Expense',
  titlePlural: 'Expenses',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'category', label: 'Category', badge: true },
    { key: 'expense_date', label: 'Date', date: true },
    { key: 'amount', label: 'Amount', money: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'category', label: 'Category', type: 'select', options: ['fuel', 'repair', 'maintenance', 'insurance', 'tax', 'fine', 'service', 'parking', 'spare_parts', 'other'], default: 'fuel' },
    { key: 'expense_date', label: 'Date', type: 'date', default: 'today', required: true },
    { key: 'amount', label: 'Amount (RWF)', type: 'number', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'receipt_url', label: 'Receipt', type: 'file', folder: 'receipts' }
  ]
}

export const nonWorkingDayConfig = {
  table: 'non_working_days',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Non-Working Day',
  titlePlural: 'Non-Working Days',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'date', label: 'Date', date: true },
    { key: 'reason', label: 'Reason', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'date', label: 'Date', type: 'date', default: 'today', required: true },
    { key: 'reason', label: 'Reason', type: 'select', options: ['garage', 'accident', 'driver_sick', 'public_holiday', 'personal_leave', 'other'], default: 'other' },
    { key: 'description', label: 'Description', type: 'textarea' }
  ],
  helperNote: 'Saturdays are skipped automatically fleet-wide — only log exceptions here (extra days off, garage time, accidents, sick leave).'
}

export const savingsGoalConfig = {
  table: 'savings_goals',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Savings Goal',
  titlePlural: 'Motorcycle Savings Goals',
  searchKeys: ['goal_name'],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'goal_name', label: 'Goal' },
    { key: 'current_amount', label: 'Saved', money: true },
    { key: 'target_amount', label: 'Target', money: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'goal_name', label: 'Goal name', type: 'text', required: true },
    { key: 'target_amount', label: 'Target amount (RWF)', type: 'number', required: true },
    { key: 'current_amount', label: 'Current amount (RWF)', type: 'number', default: 0 },
    { key: 'start_date', label: 'Start date', type: 'date', default: 'today' },
    { key: 'target_date', label: 'Target date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'cancelled'], default: 'active' }
  ]
}

export const fleetSavingsGoalConfig = {
  table: 'fleet_savings_goals',
  select: '*',
  titleSingular: 'Fleet Savings Goal',
  titlePlural: 'Fleet Savings Goals',
  searchKeys: ['goal_name'],
  columns: [
    { key: 'goal_name', label: 'Goal' },
    { key: 'current_amount', label: 'Saved', money: true },
    { key: 'target_amount', label: 'Target', money: true },
    { key: 'target_date', label: 'Target date', date: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'goal_name', label: 'Goal name', type: 'text', required: true },
    { key: 'target_amount', label: 'Target amount (RWF)', type: 'number', required: true },
    { key: 'current_amount', label: 'Current amount (RWF)', type: 'number', default: 0 },
    { key: 'start_date', label: 'Start date', type: 'date', default: 'today' },
    { key: 'target_date', label: 'Target date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'cancelled'], default: 'active' }
  ]
}

export const reminderConfig = {
  table: 'reminders',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Reminder',
  titlePlural: 'Reminders',
  searchKeys: ['title'],
  columns: [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type', badge: true },
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'due_date', label: 'Due', date: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle (optional)', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' } },
    { key: 'type', label: 'Type', type: 'select', options: ['insurance', 'tax', 'inspection', 'contravention', 'maintenance', 'custom'], default: 'custom' },
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'amount', label: 'Amount (RWF)', type: 'number' },
    { key: 'issue_date', label: 'Issue date', type: 'date' },
    { key: 'due_date', label: 'Due date', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['pending', 'completed', 'overdue'], default: 'pending' },
    { key: 'attachment_url', label: 'Attachment', type: 'file', folder: 'reminders' }
  ]
}

export const insuranceConfig = {
  table: 'insurance_records',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Insurance Record',
  titlePlural: 'Insurance',
  searchKeys: ['insurance_company', 'policy_number'],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'insurance_company', label: 'Company' },
    { key: 'policy_number', label: 'Policy #' },
    { key: 'expiry_date', label: 'Expires', date: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'insurance_company', label: 'Insurance company', type: 'text' },
    { key: 'policy_number', label: 'Policy number', type: 'text' },
    { key: 'start_date', label: 'Start date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date', required: true },
    { key: 'document_url', label: 'Policy document', type: 'file', folder: 'insurance' }
  ]
}

export const taxConfig = {
  table: 'tax_records',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Tax Record',
  titlePlural: 'Tax Records',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'tax_amount', label: 'Amount', money: true },
    { key: 'due_date', label: 'Due', date: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'tax_amount', label: 'Tax amount (RWF)', type: 'number' },
    { key: 'payment_date', label: 'Payment date', type: 'date' },
    { key: 'due_date', label: 'Due date', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['paid', 'pending', 'overdue'], default: 'pending' },
    { key: 'receipt_url', label: 'Receipt', type: 'file', folder: 'tax' }
  ]
}

export const inspectionConfig = {
  table: 'inspections',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Inspection',
  titlePlural: 'Inspections',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'inspection_date', label: 'Inspected', date: true },
    { key: 'next_due_date', label: 'Next due', date: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'inspection_date', label: 'Inspection date', type: 'date', default: 'today', required: true },
    { key: 'next_due_date', label: 'Next due date', type: 'date' },
    { key: 'certificate_url', label: 'Certificate', type: 'file', folder: 'inspections' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ]
}

export const versementConfig = {
  table: 'versements',
  select: '*, motorcycles(plate_number, daily_target), drivers(full_name)',
  titleSingular: 'Collection',
  titlePlural: 'Collections',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'drivers.full_name', label: 'Driver' },
    { key: 'collection_date', label: 'Date', date: true },
    { key: 'amount', label: 'Amount', money: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'driver_id', label: 'Driver', type: 'relation', relation: { table: 'drivers', labelKey: 'full_name' } },
    { key: 'collection_date', label: 'Collection date', type: 'date', default: 'today', required: true },
    { key: 'amount', label: 'Amount (RWF)', type: 'number', required: true },
    { key: 'payment_method', label: 'Payment method', type: 'select', options: ['cash', 'mobile_money', 'bank_transfer', 'other'], default: 'cash' },
    { key: 'reference_number', label: 'Reference number', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: ['paid', 'unpaid', 'partial'], default: 'paid' },
    { key: 'screenshot_url', label: 'Payment screenshot', type: 'file', folder: 'versements' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ]
}

export const debtConfig = {
  table: 'debts',
  select: '*, motorcycles(plate_number), drivers(full_name)',
  titleSingular: 'Debt',
  titlePlural: 'Debts',
  searchKeys: [],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'drivers.full_name', label: 'Driver' },
    { key: 'debt_date', label: 'Date', date: true },
    { key: 'original_amount', label: 'Original', money: true },
    { key: 'remaining_amount', label: 'Remaining', money: true },
    { key: 'status', label: 'Status', badge: true }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'driver_id', label: 'Driver', type: 'relation', relation: { table: 'drivers', labelKey: 'full_name' } },
    { key: 'debt_date', label: 'Debt date', type: 'date', default: 'today', required: true },
    { key: 'original_amount', label: 'Original amount (RWF)', type: 'number', required: true },
    { key: 'remaining_amount', label: 'Remaining amount (RWF)', type: 'number', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'paid', 'waived'], default: 'active' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ]
}

export const documentConfig = {
  table: 'documents',
  select: '*, motorcycles(plate_number)',
  titleSingular: 'Document',
  titlePlural: 'Documents',
  searchKeys: ['file_name'],
  columns: [
    { key: 'motorcycles.plate_number', label: 'Motorcycle', plate: true },
    { key: 'document_type', label: 'Type', badge: true },
    { key: 'file_name', label: 'File' }
  ],
  fields: [
    { key: 'motorcycle_id', label: 'Motorcycle', type: 'relation', relation: { table: 'motorcycles', labelKey: 'plate_number' }, required: true },
    { key: 'document_type', label: 'Document type', type: 'select', options: ['insurance', 'tax', 'inspection', 'registration', 'ownership', 'other'], default: 'other' },
    { key: 'file_name', label: 'File name', type: 'text', required: true },
    { key: 'file_url', label: 'File', type: 'file', folder: 'documents', required: true }
  ]
}
