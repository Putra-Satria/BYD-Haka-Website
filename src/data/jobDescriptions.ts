export interface JobDescription {
  position: string;
  description: string[];
  generalQualifications: string[];
  specificQualifications: string[];
  benefits: string[];
}

export const jobDescriptions: Record<string, JobDescription> = {
  "Accounting": {
    position: "Accounting",
    description: [
      "Ensure accounting data is recorded in an accountable and auditable manner",
      "Implement oversight for data collection and processing",
      "Ensure compliance in the reporting of financial data",
      "Comply with applicable accounting standards and regulations",
      "Identify and mitigate risks associated with financial reporting"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized",
      "Knowledge of grooming techniques"
    ],
    specificQualifications: [
      "Bachelor's degree (S1) in Accounting",
      "Max. age 28 years old",
      "Minimum 2 years of experience in Accounting",
      "Proficient in Ms. Office (especially Excel)",
      "Knowledge of financial reporting",
      "Understanding of tax regulations and compliance"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Admin Sales": {
    position: "Admin Sales",
    description: [
      "Prepare & process sales-related documents",
      "Maintain and update database & inventory records",
      "Coordinate with finance/logistics/service to ensure smooth delivery",
      "Handle day-to-day administrative tasks"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Diploma in Business Administration/Management or related major",
      "Minimum 2 years experience in admin/sales support (automotive preferred)",
      "Fresh graduate open to apply",
      "Strong MS Office expertise (Excel, Word, PowerPoint)",
      "Familiarity with sales documentation processes"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Administration Head": {
    position: "Administration Head",
    description: [
      "Oversee daily administrative operations",
      "Supervise, train, and guide administrative staff",
      "Monitor performance and control operational costs",
      "Maintain a professional office environment"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Bachelor's degree in Business/Management/related field",
      "Minimum 4 years experience in admin management",
      "Strong communication skills",
      "Accounting knowledge is a plus",
      "High integrity & professionalism"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Branch Manager": {
    position: "Branch Manager",
    description: [
      "Achieve branch sales, service quality & profitability targets",
      "Implement growth strategies aligned with company objectives",
      "Lead operational development in sales/service/spare parts"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Bachelor's degree in any major",
      "Minimum 5 years experience as Branch Manager (automotive preferred)",
      "Strong leadership and performance management",
      "Target-oriented and decisive"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Cashier": {
    position: "Cashier",
    description: [
      "Handle customer payments and issue receipts",
      "Operate cash register and process transactions accurately",
      "Maintain excellent service to customers"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Diploma/Bachelor's in Accounting or related field",
      "Minimum 1 year cashier experience preferred",
      "Good administrative abilities",
      "Basic accounting knowledge",
      "Able to work under pressure, honest & detail-oriented"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Customer Relation Officer": {
    position: "Customer Relation Officer",
    description: [
      "Provide information and handle complaints",
      "Follow up customers post-purchase/service",
      "Maintain strong customer satisfaction and loyalty"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Minimum D3, any major",
      "Minimum 1 year experience in Customer Relations",
      "Excellent communication and MS Office skills",
      "Able to work independently or in a team",
      "Good analytical & problem-solving ability"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "In House Trainer": {
    position: "In House Trainer",
    description: [
      "Create and update dealership training programs",
      "Facilitate workshops, seminars & coaching",
      "Evaluate training effectiveness using KPI & metrics",
      "Stay updated on automotive products & trends"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Bachelor's degree in Business/Education/Automotive Engineering",
      "1–3 years experience in automotive or dealership training",
      "Familiar with e-learning & presentation software",
      "Preferably experienced in training/teaching"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Mechanic": {
    position: "Mechanic",
    description: [
      "Perform maintenance, inspection, and repair of vehicles",
      "Ensure safety and quality aligned with standards"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Vocational School/Diploma in Automotive Engineering",
      "Minimum 2 years as Mechanic",
      "Eager to learn EV technologies",
      "EV/Hybrid experience is a plus",
      "Automotive technical certification preferred",
      "Must have valid driver's license"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Partman": {
    position: "Partman",
    description: [
      "Manage, source & distribute automotive parts",
      "Maintain accurate inventory and records",
      "Provide technical parts support for timely repairs"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "D3 Automotive Engineering or related field",
      "Min. 2 years as Partman in automotive dealers",
      "Proficient in MS Office & DMS",
      "Knowledge of EV/hybrid is a plus",
      "Detail-oriented in selecting parts"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Sales Supervisor": {
    position: "Sales Supervisor",
    description: [
      "Lead and manage sales teams to hit sales targets",
      "Handle escalations and operational issues",
      "Analyze competitive automotive trends"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "D3/S1 any major",
      "3–5 years experience in automotive sales",
      "Strong leadership and communication skills",
      "Target-oriented and strategic mindset"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Service Advisor": {
    position: "Service Advisor",
    description: [
      "Identify service needs & communicate repair solutions",
      "Provide accurate estimates and maintain follow-ups",
      "Ensure excellent customer experience"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "D3 Automotive Engineering or related field",
      "Min. 3 years experience as Service Advisor",
      "EV/hybrid service experience is a plus",
      "Technical certification preferred",
      "Must have valid driver's license"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Service Manager": {
    position: "Service Manager",
    description: [
      "Maximize aftersales operational efficiency",
      "Lead, mentor & develop service teams",
      "Ensure profitability and customer satisfaction"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Bachelor's degree, any major",
      "Min. 4 years experience managing aftersales",
      "Strong leadership & communication skills",
      "Dealer operations & Six Sigma certification is a plus",
      "Preferably experienced Manager/Assistant Manager in service"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  },
  "Stock Management": {
    position: "Stock Management",
    description: [
      "Maintain precise stock status reporting & documentation",
      "Monitor unit status to prevent double booking",
      "Support Sales team via accurate movement tracking"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "SMK/Diploma in Automotive Industry",
      "Experience in dealership/workshop is a plus",
      "Valid driver's license required",
      "Strong understanding of vehicle components"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  }
};

// Function to get job description, with fallback to generic description
export function getJobDescription(position: string): JobDescription {
  // Normalize position name to handle variations
  const normalizedPosition = position.split(" - ")[0].trim();
  
  // Check for exact match
  if (jobDescriptions[normalizedPosition]) {
    return jobDescriptions[normalizedPosition];
  }
  
  // Check for partial match (e.g., "Sales Executive" matches "Sales")
  const partialMatch = Object.keys(jobDescriptions).find(key => 
    normalizedPosition.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(normalizedPosition.toLowerCase())
  );
  
  if (partialMatch) {
    return jobDescriptions[partialMatch];
  }
  
  // Return generic description if no match found
  return {
    position: normalizedPosition,
    description: [
      "Ensure achievement of targets through BYD vehicle sales according to procedures",
      "Provide service according to company standards and complete vehicle documentation"
    ],
    generalQualifications: [
      "Effective communication skills",
      "Knowledge of products",
      "Ability to understand consumer needs",
      "Customer-focused mindset",
      "Capable of working with targets",
      "Ability to be adaptable, persuasive and organized"
    ],
    specificQualifications: [
      "Minimum Diploma (D3) or experienced High School graduate",
      "Fresh graduates are welcome to apply",
      "Proficient in Microsoft Office",
      "Preferably residing in or near the placement area"
    ],
    benefits: [
      "Career Growth",
      "Incentives & Bonus",
      "Health & Employment Insurance",
      "Meal & Transport Allowance"
    ]
  };
}
