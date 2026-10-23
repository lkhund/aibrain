# Aibrain HR

A Georgian HR workspace with the eight day-to-day modules: employee records, profiles, approval requests, the monthly tabel, shifts and attendance, payroll, shared documents, and reports.

The demo company is შპს „მთაწმინდა ლაბი“. Data lives in `data/hr.sqlite` and is created on first launch. Payroll uses the Georgian 20% income tax and the 2% + 2% pension split. Overtime is paid at 1.5× the hourly rate.

## Run

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000 and sign in. Every demo password is `demo1234`.

On Vercel the database file is created under `/tmp` and seeded when a function instance starts. Sign-in and the sample company work there. Edits live only as long as that instance does.

| Role | Email |
| --- | --- |
| HR | nino@demo.ge |
| Manager | luka@demo.ge |
| Finance | mariam@demo.ge |
| Director | giorgi@demo.ge |
| Employee | ana@demo.ge |

HR can restore the sample company from Settings. The interface is Georgian by default, with an English switch.
