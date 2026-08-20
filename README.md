# BYD Haka Careers Hub

A comprehensive recruitment and career management platform developed for Bumi Hijau Motor / HAKA Auto. This application streamlines the hiring process by providing a centralized hub for job seekers to apply and for HR administrators to manage the recruitment lifecycle.

## 🚀 Features

### For Candidates
*   **Job Discovery**: Browse and search for available career opportunities.
*   **Application System**: Easy-to-use application forms with file upload support (CV, certificates).
*   **Application Tracking**: Monitor the status of submitted applications in real-time.
*   **Profile Management**: Manage personal information, education history, and documents.
*   **Saved Jobs**: Bookmark interesting positions for later.

### For HR / Admins
*   **Admin Dashboard**: Overview of recruitment metrics and recent activities.
*   **Job Management**: Post, edit, and manage job listings.
*   **Applicant Management**: Review applicants, track their status through the hiring pipeline.
*   **Talent Pool**: Access a database of potential candidates.
*   **Employee Onboarding**: Manage data for new hires and fixed employees.
*   **Interview Scheduling**: Schedule and manage candidate interviews.

## 🛠️ Technology Stack

This project is built using modern web technologies to ensure performance, scalability, and developer experience:

*   **Frontend Framework**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
*   **Backend & Auth**: [Supabase](https://supabase.com/) (Authentication, Database, Storage)
*   **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
*   **Form Handling**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
*   **Routing**: [React Router](https://reactrouter.com/)
*   **Visualizations**: [Recharts](https://recharts.org/) for charts, [React Big Calendar](https://github.com/jquense/react-big-calendar) for scheduling
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)

## 📦 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (Version 18 or higher recommended)
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ict-bumiauto/hakaauto-rekrutmen.git
    cd byd-haka-careers-hub
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You will need to configure your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:8080](http://localhost:8080) (or the port shown in your terminal) to view the application.

## 📜 Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the app for production.
*   `npm run preview`: Locally preview the production build.
*   `npm run lint`: Runs ESLint to check for code quality issues.

## 📂 Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   ├── pages/           # Application pages (routes)
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Entry point
├── supabase/            # Supabase migrations and SQL scripts
└── ...
```

## 📄 License

This project is private and proprietary to Bumi Hijau Motor / HAKA Auto.
