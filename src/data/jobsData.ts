export interface Job {
  id: string;
  position: string;
  branch: string;
  location: string;
  province: string;
  type: string;
  isOpen?: boolean;
}

export const jobsData: Job[] = [
  // Head Office Jakarta
  { id: "1", position: "Sales Support Assistant Manager", branch: "Head Office Jakarta", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "2", position: "HC & GA Manager", branch: "Head Office Jakarta", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "3", position: "Finance Staff", branch: "Head Office Jakarta", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "4", position: "Procurement", branch: "Head Office Jakarta", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },

  // Denza Pluit
  { id: "5", position: "Accounting", branch: "Denza Pluit", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },

  // Jakarta Area
  { id: "6", position: "Branch Manager", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "7", position: "Sales Supervisor", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "8", position: "Sales Executive", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "9", position: "Administration Head", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "10", position: "Admin Service", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "11", position: "Admin Sales", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "12", position: "Invoice Admin", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "13", position: "Accounting", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "14", position: "Cashier", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "15", position: "Service Manager", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "16", position: "Service Advisor", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "17", position: "Partman", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "18", position: "Mechanic", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "19", position: "Customer Relation Officer", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "20", position: "Marketing Specialist", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "21", position: "HR & General Affairs", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "22", position: "In House Trainer", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "23", position: "Pre Delivery Inspection", branch: "Jakarta Area", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },

  // Malang
  { id: "24", position: "Sales Supervisor", branch: "BYD Haka Malang", location: "Malang", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "25", position: "Sales Executive", branch: "BYD Haka Malang", location: "Malang", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "26", position: "Customer Relation Officer", branch: "BYD Haka Malang", location: "Malang", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "27", position: "Service Advisor", branch: "BYD Haka Malang", location: "Malang", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "28", position: "Cashier", branch: "BYD Haka Malang", location: "Malang", province: "Jawa Timur", type: "Full Time", isOpen: true },

  // Karebosi
  { id: "29", position: "Sales Supervisor", branch: "BYD Haka Karebosi", location: "Makassar", province: "Sulawesi Selatan", type: "Full Time", isOpen: true },
  { id: "30", position: "Sales Executive", branch: "BYD Haka Karebosi", location: "Makassar", province: "Sulawesi Selatan", type: "Full Time", isOpen: true },
  { id: "31", position: "Admin Sales", branch: "BYD Haka Karebosi", location: "Makassar", province: "Sulawesi Selatan", type: "Full Time", isOpen: true },
  { id: "32", position: "HR & General Affairs", branch: "BYD Haka Karebosi", location: "Makassar", province: "Sulawesi Selatan", type: "Full Time", isOpen: true },
  { id: "33", position: "Pre Delivery Inspection", branch: "BYD Haka Karebosi", location: "Makassar", province: "Sulawesi Selatan", type: "Full Time", isOpen: true },

  // Balikpapan
  { id: "34", position: "Sales Supervisor", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "35", position: "Sales Executive", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "36", position: "Mechanic", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "37", position: "Service Advisor", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "38", position: "Admin Service", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "39", position: "Marketing Specialist", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "40", position: "Pre Delivery Inspection", branch: "BYD Haka Balikpapan", location: "Balikpapan", province: "Kalimantan Timur", type: "Full Time", isOpen: true },

  // Cibubur
  { id: "41", position: "Marketing Specialist", branch: "BYD Haka Cibubur", location: "Cibubur", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "42", position: "Partman", branch: "BYD Haka Cibubur", location: "Cibubur", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "43", position: "Mechanic", branch: "BYD Haka Cibubur", location: "Cibubur", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "44", position: "Pre Delivery Inspection", branch: "BYD Haka Cibubur", location: "Cibubur", province: "Jawa Barat", type: "Full Time", isOpen: true },

  // New Branches
  { id: "45", position: "Branch Manager", branch: "BYD Haka Manado", location: "Manado", province: "Sulawesi Utara", type: "Full Time", isOpen: true },
  { id: "46", position: "Branch Manager", branch: "BYD Haka Palu", location: "Palu", province: "Sulawesi Tengah", type: "Full Time", isOpen: true },
  { id: "47", position: "Branch Manager", branch: "BYD Haka Kendari", location: "Kendari", province: "Sulawesi Tenggara", type: "Full Time", isOpen: true },
  { id: "48", position: "Branch Manager", branch: "BYD Haka Dago Bandung", location: "Bandung", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "49", position: "Branch Manager", branch: "BYD Haka Solo", location: "Solo", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "50", position: "Branch Manager", branch: "BYD Haka Klaten", location: "Klaten", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "51", position: "Branch Manager", branch: "BYD Haka Semarang", location: "Semarang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "52", position: "Branch Manager", branch: "BYD Haka Banjarmasin", location: "Banjarmasin", province: "Kalimantan Selatan", type: "Full Time", isOpen: true },
  { id: "53", position: "Branch Manager", branch: "BYD Haka Samarinda", location: "Samarinda", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "54", position: "Branch Manager", branch: "BYD Haka MERR Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "55", position: "Branch Manager", branch: "Denza Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "56", position: "Branch Manager", branch: "BYD Haka Karawaci", location: "Karawaci", province: "Banten", type: "Full Time", isOpen: true },
  { id: "57", position: "Branch Manager", branch: "BYD Haka Gresik", location: "Gresik", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "58", position: "Branch Manager", branch: "BYD Haka Madiun", location: "Madiun", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "59", position: "Branch Manager", branch: "BYD Haka Magelang", location: "Magelang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "60", position: "Branch Manager", branch: "BYD Haka Pati", location: "Pati", province: "Jawa Tengah", type: "Full Time", isOpen: true },

  // Sales Supervisors for new branches
  { id: "61", position: "Sales Supervisor", branch: "BYD Haka Manado", location: "Manado", province: "Sulawesi Utara", type: "Full Time", isOpen: true },
  { id: "62", position: "Sales Supervisor", branch: "BYD Haka Palu", location: "Palu", province: "Sulawesi Tengah", type: "Full Time", isOpen: true },
  { id: "63", position: "Sales Supervisor", branch: "BYD Haka Kendari", location: "Kendari", province: "Sulawesi Tenggara", type: "Full Time", isOpen: true },
  { id: "64", position: "Sales Supervisor", branch: "BYD Haka Dago Bandung", location: "Bandung", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "65", position: "Sales Supervisor", branch: "BYD Haka Solo", location: "Solo", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "66", position: "Sales Supervisor", branch: "BYD Haka Klaten", location: "Klaten", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "67", position: "Sales Supervisor", branch: "BYD Haka Semarang", location: "Semarang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "68", position: "Sales Supervisor", branch: "BYD Haka Banjarmasin", location: "Banjarmasin", province: "Kalimantan Selatan", type: "Full Time", isOpen: true },
  { id: "69", position: "Sales Supervisor", branch: "BYD Haka Samarinda", location: "Samarinda", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "70", position: "Sales Supervisor", branch: "BYD Haka MERR Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "71", position: "Sales Supervisor", branch: "Denza Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "72", position: "Sales Supervisor", branch: "BYD Haka Karawaci", location: "Karawaci", province: "Banten", type: "Full Time", isOpen: true },
  { id: "73", position: "Sales Supervisor", branch: "BYD Haka Gresik", location: "Gresik", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "74", position: "Sales Supervisor", branch: "BYD Haka Madiun", location: "Madiun", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "75", position: "Sales Supervisor", branch: "BYD Haka Magelang", location: "Magelang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "76", position: "Sales Supervisor", branch: "BYD Haka Pati", location: "Pati", province: "Jawa Tengah", type: "Full Time", isOpen: true },

  // Sales Executives for new branches (continued in next section due to length)
  { id: "77", position: "Sales Executive", branch: "BYD Haka Manado", location: "Manado", province: "Sulawesi Utara", type: "Full Time", isOpen: true },
  { id: "78", position: "Sales Executive", branch: "BYD Haka Palu", location: "Palu", province: "Sulawesi Tengah", type: "Full Time", isOpen: true },
  { id: "79", position: "Sales Executive", branch: "BYD Haka Kendari", location: "Kendari", province: "Sulawesi Tenggara", type: "Full Time", isOpen: true },
  { id: "80", position: "Sales Executive", branch: "BYD Haka Dago Bandung", location: "Bandung", province: "Jawa Barat", type: "Full Time", isOpen: true },
  { id: "81", position: "Sales Executive", branch: "BYD Haka Solo", location: "Solo", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "82", position: "Sales Executive", branch: "BYD Haka Klaten", location: "Klaten", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "83", position: "Sales Executive", branch: "BYD Haka Semarang", location: "Semarang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "84", position: "Sales Executive", branch: "BYD Haka Banjarmasin", location: "Banjarmasin", province: "Kalimantan Selatan", type: "Full Time", isOpen: true },
  { id: "85", position: "Sales Executive", branch: "BYD Haka Samarinda", location: "Samarinda", province: "Kalimantan Timur", type: "Full Time", isOpen: true },
  { id: "86", position: "Sales Executive", branch: "BYD Haka MERR Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "87", position: "Sales Executive", branch: "Denza Surabaya", location: "Surabaya", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "88", position: "Sales Executive", branch: "BYD Haka Karawaci", location: "Karawaci", province: "Banten", type: "Full Time", isOpen: true },
  { id: "89", position: "Sales Executive", branch: "BYD Haka Gresik", location: "Gresik", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "90", position: "Sales Executive", branch: "BYD Haka Madiun", location: "Madiun", province: "Jawa Timur", type: "Full Time", isOpen: true },
  { id: "91", position: "Sales Executive", branch: "BYD Haka Magelang", location: "Magelang", province: "Jawa Tengah", type: "Full Time", isOpen: true },
  { id: "92", position: "Sales Executive", branch: "BYD Haka Pati", location: "Pati", province: "Jawa Tengah", type: "Full Time", isOpen: true },

  // Additional positions for Denza Pondok Indah
  { id: "200", position: "Administration Head", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "201", position: "Administration", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "202", position: "Service Manager", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "203", position: "Service Advisor", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "204", position: "Partman/Mekanik", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "205", position: "Customer Relation Officer", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "206", position: "Marketing Specialist", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "207", position: "Personalia & General Affair", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "208", position: "In House Trainer", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
  { id: "209", position: "Stock Management", branch: "Denza Pondok Indah", location: "Jakarta", province: "DKI Jakarta", type: "Full Time", isOpen: true },
];
