export const translations = {
  EN: {
    branding: {
      appName: 'Taktik CRM',
      appSubtitle: 'Travel Management',
    },
    navigation: {
      dashboard: 'Dashboard',
      clients: 'Clients',
      tasks: 'Tasks',
      admin: 'Admin Panel',
      settings: 'Settings',
      reports: 'Reports',
    },
    header: {
      dashboardTitle: 'Dashboard',
      dashboardSubtitle: 'Welcome to Taktik CRM',
      clientsTitle: 'Clients',
      clientsSubtitle: 'Manage your travel agency client database',
      tasksTitle: 'Tasks & Reminders',
      tasksSubtitle: 'Track follow-ups and client tasks',
      adminTitle: 'Admin Panel',
      adminSubtitle: 'System management and analytics',
    },
    actions: {
      addClient: 'Add Client',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
    },
  },
  AR: {
    branding: {
      appName: 'تكتيك لإدارة العملاء',
      appSubtitle: 'إدارة عملاء السفر',
    },
    navigation: {
      dashboard: 'لوحة التحكم',
      clients: 'العملاء',
      tasks: 'المهام',
      admin: 'لوحة الإدارة',
      settings: 'الإعدادات',
      reports: 'التقارير',
    },
    header: {
      dashboardTitle: 'لوحة التحكم',
      dashboardSubtitle: 'مرحبا بك في تكتيك لإدارة العملاء',
      clientsTitle: 'العملاء',
      clientsSubtitle: 'إدارة قاعدة بيانات عملاء وكالة السفر الخاصة بك',
      tasksTitle: 'المهام والتذكيرات',
      tasksSubtitle: 'تتبع المتابعات والمهام العميلية',
      adminTitle: 'لوحة الإدارة',
      adminSubtitle: 'إدارة النظام والتحليلات',
    },
    actions: {
      addClient: 'إضافة عميل',
      search: 'بحث',
      filter: 'تصفية',
      export: 'تصدير',
      edit: 'تحرير',
      delete: 'حذف',
      save: 'حفظ',
      cancel: 'إلغاء',
    },
  },
} as const;

export type Language = keyof typeof translations;
