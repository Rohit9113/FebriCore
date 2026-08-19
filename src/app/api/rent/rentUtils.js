// app/api/rent/rentUtils.js
export const getRentForDate = (dateStr, rentDoc) => {
  const history = [...(rentDoc.rentHistory || [])].sort(
    (a, b) => new Date(a.from) - new Date(b.from)
  );

  let amount = rentDoc.monthlyRent || 0;

  if (history.length > 0) {
    let applicable = null;
    for (const h of history) {
      if (h.from <= dateStr) applicable = h.amount;
      else break;
    }
    if (applicable !== null) amount = applicable;
  }

  return amount;
};

export const getDueDate = (month, dueDay) => {
  const [y, m] = month.split("-").map(Number);
  const dd = String(Math.min(28, Math.max(1, Number(dueDay) || 5))).padStart(2, "0");
  const nextMonth = new Date(y, m, 1);
  const ny = nextMonth.getFullYear();
  const nm = String(nextMonth.getMonth() + 1).padStart(2, "0");

  return `${ny}-${nm}-${dd}`;
};
export const getMonthStatus = (month, rentDoc) => {
  const rentAmount = getRentForDate(`${month}-01`, rentDoc);
  const dueDate    = getDueDate(month, rentDoc.dueDay);

  const monthPayments = (rentDoc.payments || []).filter((p) => p.forMonth === month);
  const totalPaid = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const today = new Date().toISOString().split("T")[0];
  const firstPaidOn = monthPayments.map((p) => p.paidOn).sort()[0] || null;

  let status;
  if (totalPaid <= 0) {
    status = today > dueDate ? "overdue" : "pending";
  } else if (totalPaid < rentAmount) {
    status = "partial";
  } else if (firstPaidOn && firstPaidOn < `${month}-01`) {
    status = "advance";
  } else if (firstPaidOn && firstPaidOn <= dueDate) {
    status = "on-time";
  } else {
    status = "late";
  }

  const lateDays = status === "late" && firstPaidOn
    ? Math.round((new Date(firstPaidOn) - new Date(dueDate)) / 86400000)
    : 0;

  return {
    month,
    rentAmount,
    dueDate,
    totalPaid,
    due: Math.max(0, rentAmount - totalPaid),
    status,
    lateDays,
    firstPaidOn,
    payments: monthPayments.sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1)),
  };
};

export const getMonthsSummary = (rentDoc, monthsBack = 12) => {
  const months = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const paidMonths = [...new Set((rentDoc.payments || []).map((p) => p.forMonth))];
  paidMonths.forEach((m) => { if (!months.includes(m)) months.push(m); });

  let filtered = months;
  if (rentDoc.rentStartMonth) {
    filtered = filtered.filter((m) => m >= rentDoc.rentStartMonth);
  }

  filtered.sort();
  return filtered.map((m) => getMonthStatus(m, rentDoc)).reverse(); // latest first
};