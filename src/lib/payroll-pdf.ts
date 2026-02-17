// Payroll PDF generator using browser print
export interface PayrollRecord {
  teacher_name: string;
  monthly_salary: number;
  total_days_in_month: number;
  deductible_absences: number;
  total_deduction: number;
  security_deposit_deduction: number;
  advance_deduction: number;
  loan_deduction: number;
  net_salary: number;
  status: string;
}

export function generatePayrollPDF(
  records: PayrollRecord[],
  month: string,
  year: string,
  schoolName?: string
) {
  const totalNet = records.reduce((s, r) => s + r.net_salary, 0);
  const totalGross = records.reduce((s, r) => s + r.monthly_salary, 0);
  const totalDeductions = records.reduce((s, r) => s + r.total_deduction + r.security_deposit_deduction + r.advance_deduction + r.loan_deduction, 0);

  const rows = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.teacher_name}</td>
      <td>PKR ${r.monthly_salary.toLocaleString()}</td>
      <td>${r.total_days_in_month}</td>
      <td>${r.deductible_absences}</td>
      <td>PKR ${r.total_deduction.toLocaleString()}</td>
      <td>PKR ${r.security_deposit_deduction.toLocaleString()}</td>
      <td>PKR ${r.advance_deduction.toLocaleString()}</td>
      <td>PKR ${r.loan_deduction.toLocaleString()}</td>
      <td><strong>PKR ${r.net_salary.toLocaleString()}</strong></td>
      <td>${r.status}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payroll Report - ${month} ${year}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin-bottom: 4px; }
        .header h2 { font-size: 14px; color: #555; }
        .header p { font-size: 11px; color: #777; }
        .summary { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .summary-item { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; text-align: center; }
        .summary-item .label { font-size: 10px; color: #777; }
        .summary-item .value { font-size: 14px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background-color: #333; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; }
        .signature { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 11px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${schoolName ? `<h1>${schoolName}</h1>` : ''}
        <h2>Payroll Report - ${month} ${year}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="summary">
        <div class="summary-item"><div class="label">Total Gross</div><div class="value">PKR ${totalGross.toLocaleString()}</div></div>
        <div class="summary-item"><div class="label">Total Deductions</div><div class="value">PKR ${totalDeductions.toLocaleString()}</div></div>
        <div class="summary-item"><div class="label">Net Payable</div><div class="value">PKR ${totalNet.toLocaleString()}</div></div>
        <div class="summary-item"><div class="label">Teachers</div><div class="value">${records.length}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Teacher</th>
            <th>Gross</th>
            <th>Days</th>
            <th>Absent</th>
            <th>Absent Ded.</th>
            <th>Deposit Ded.</th>
            <th>Advance Ded.</th>
            <th>Loan Ded.</th>
            <th>Net Salary</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        <div class="signature">Prepared By</div>
        <div class="signature">Approved By</div>
        <div class="signature">Principal</div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
