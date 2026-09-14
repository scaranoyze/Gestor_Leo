const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

const defaultData = {
  transactions: [],
  fixedBills: [],
  subscriptions: [],
  cards: [],
  loans: [],
  investments: [],
  goals: [],
  categories: [
    "Salário",
    "Renda extra",
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Educação",
    "Compras",
    "Assinaturas",
    "Investimentos",
    "Empréstimos",
    "Outros"
  ]
};

const state = JSON.parse(localStorage.getItem("bruno_financeiro")) || defaultData;

function save() {
  localStorage.setItem("bruno_financeiro", JSON.stringify(state));
  renderAll();
}

function formatDate(date) {
  if (!date) return "-";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function monthKey(date) {
  return date?.slice(0, 7);
}

function totalByType(type, filter = () => true) {
  return state.transactions
    .filter(t => t.type === type && filter(t))
    .reduce((sum, t) => sum + Number(t.value), 0);
}

function transactionBalance(filter = () => true) {
  return totalByType("entrada", filter) - totalByType("saida", filter);
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");

    document.getElementById("pageTitle").textContent = btn.textContent.trim();
  });
});

const modal = document.getElementById("transactionModal");
const openModal = () => {
  fillCategories();
  document.getElementById("transactionDate").value = today;
  modal.classList.add("open");
};
const closeModal = () => modal.classList.remove("open");

document.getElementById("openTransaction").addEventListener("click", openModal);
document.getElementById("openTransactionSecondary").addEventListener("click", openModal);
document.getElementById("closeTransaction").addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

function fillCategories() {
  const select = document.getElementById("transactionCategory");
  select.innerHTML = state.categories.map(c => `<option>${c}</option>`).join("");
}

document.getElementById("transactionForm").addEventListener("submit", e => {
  e.preventDefault();
  state.transactions.unshift({
    id: crypto.randomUUID(),
    type: document.getElementById("transactionType").value,
    description: document.getElementById("transactionDescription").value,
    category: document.getElementById("transactionCategory").value,
    value: Number(document.getElementById("transactionValue").value),
    date: document.getElementById("transactionDate").value,
    payment: document.getElementById("transactionPayment").value,
    note: document.getElementById("transactionNote").value
  });
  e.target.reset();
  closeModal();
  save();
});

document.getElementById("salaryForm").addEventListener("submit", e => {
  e.preventDefault();
  state.transactions.unshift({
    id: crypto.randomUUID(),
    type: "entrada",
    description: "Salário",
    category: "Salário",
    value: Number(document.getElementById("salaryValue").value),
    date: document.getElementById("salaryDate").value,
    payment: "Conta",
    note: ""
  });
  e.target.reset();
  save();
});

document.getElementById("extraIncomeForm").addEventListener("submit", e => {
  e.preventDefault();
  state.transactions.unshift({
    id: crypto.randomUUID(),
    type: "entrada",
    description: document.getElementById("extraIncomeDescription").value,
    category: "Renda extra",
    value: Number(document.getElementById("extraIncomeValue").value),
    date: document.getElementById("extraIncomeDate").value,
    payment: "Conta",
    note: ""
  });
  e.target.reset();
  save();
});

document.getElementById("fixedBillForm").addEventListener("submit", e => {
  e.preventDefault();
  state.fixedBills.push({
    id: crypto.randomUUID(),
    name: document.getElementById("fixedBillName").value,
    value: Number(document.getElementById("fixedBillValue").value),
    day: Number(document.getElementById("fixedBillDay").value)
  });
  e.target.reset();
  save();
});

document.getElementById("subscriptionForm").addEventListener("submit", e => {
  e.preventDefault();
  state.subscriptions.push({
    id: crypto.randomUUID(),
    name: document.getElementById("subscriptionName").value,
    value: Number(document.getElementById("subscriptionValue").value),
    day: Number(document.getElementById("subscriptionDay").value)
  });
  e.target.reset();
  save();
});

document.getElementById("cardForm").addEventListener("submit", e => {
  e.preventDefault();
  state.cards.push({
    id: crypto.randomUUID(),
    name: document.getElementById("cardName").value,
    limit: Number(document.getElementById("cardLimit").value),
    dueDay: Number(document.getElementById("cardDueDay").value)
  });
  e.target.reset();
  save();
});

function addMonthsToDate(dateString, monthsToAdd) {
  const [year, month, day] = dateString.split("-").map(Number);
  const target = new Date(year, month - 1 + monthsToAdd, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(safeDay).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildInstallments(totalValue, count, firstDueDate) {
  const totalCents = Math.round(Number(totalValue) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - (baseCents * count);

  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    value: (baseCents + (index === count - 1 ? remainder : 0)) / 100,
    dueDate: addMonthsToDate(firstDueDate, index),
    paid: false,
    paidAt: null
  }));
}

document.getElementById("loanForm").addEventListener("submit", e => {
  e.preventDefault();

  const originalValue = Number(document.getElementById("loanOriginalValue").value);
  const installmentValue = Number(document.getElementById("loanInstallmentValue").value);
  const installmentsCount = Number(document.getElementById("loanInstallments").value);
  const firstDueDate = document.getElementById("loanFirstDueDate").value;
  const totalValue = installmentValue * installmentsCount;
  const interestValue = totalValue - originalValue;

  const installments = [];
  const [year, month, day] = firstDueDate.split("-").map(Number);

  for (let i = 0; i < installmentsCount; i++) {
    const due = new Date(year, month - 1 + i, day);
    const yyyy = due.getFullYear();
    const mm = String(due.getMonth() + 1).padStart(2, "0");
    const dd = String(due.getDate()).padStart(2, "0");

    installments.push({
      number: i + 1,
      value: installmentValue,
      dueDate: `${yyyy}-${mm}-${dd}`,
      status: "pendente"
    });
  }

  state.loans.push({
    id: crypto.randomUUID(),
    name: document.getElementById("loanName").value,
    type: document.getElementById("loanType").value,
    originalValue,
    installmentValue,
    installmentsCount,
    firstDueDate,
    totalValue,
    interestValue,
    installments
  });

  e.target.reset();
  updateLoanPreview();
  save();
});

document.getElementById("investmentForm").addEventListener("submit", e => {
  e.preventDefault();
  state.investments.push({
    id: crypto.randomUUID(),
    name: document.getElementById("investmentName").value,
    value: Number(document.getElementById("investmentValue").value),
    date: document.getElementById("investmentDate").value
  });
  e.target.reset();
  save();
});

document.getElementById("goalForm").addEventListener("submit", e => {
  e.preventDefault();
  state.goals.push({
    id: crypto.randomUUID(),
    name: document.getElementById("goalName").value,
    target: Number(document.getElementById("goalTarget").value),
    current: Number(document.getElementById("goalCurrent").value),
    deadline: document.getElementById("goalDeadline").value,
    movements: []
  });
  e.target.reset();
  save();
});

document.getElementById("categoryForm").addEventListener("submit", e => {
  e.preventDefault();
  const value = document.getElementById("categoryName").value.trim();
  if (value && !state.categories.includes(value)) {
    state.categories.push(value);
  }
  e.target.reset();
  save();
});

document.getElementById("dailyDate").value = today;
document.getElementById("monthlyDate").value = currentMonth;
document.getElementById("dailyDate").addEventListener("change", renderDaily);
document.getElementById("monthlyDate").addEventListener("change", renderMonthly);


function updateLoanPreview() {
  const original = Number(document.getElementById("loanOriginalValue")?.value || 0);
  const installment = Number(document.getElementById("loanInstallmentValue")?.value || 0);
  const count = Number(document.getElementById("loanInstallments")?.value || 0);

  const total = installment * count;
  const interest = total - original;

  const originalEl = document.getElementById("previewOriginal");
  const totalEl = document.getElementById("previewTotal");
  const interestEl = document.getElementById("previewInterest");

  if (originalEl) originalEl.textContent = currency.format(original);
  if (totalEl) totalEl.textContent = currency.format(total);
  if (interestEl) interestEl.textContent = currency.format(interest);
}

["loanOriginalValue", "loanInstallmentValue", "loanInstallments"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", updateLoanPreview);
});

function toggleInstallmentStatus(loanId, installmentNumber) {
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan || !loan.installments) return;

  const installment = loan.installments.find(p => p.number === installmentNumber);
  if (!installment) return;

  installment.status = installment.status === "paga" ? "pendente" : "paga";
  save();
}

window.toggleInstallmentStatus = toggleInstallmentStatus;

function deleteFrom(collection, id) {
  state[collection] = state[collection].filter(item => item.id !== id);
  save();
}
window.deleteFrom = deleteFrom;

function toggleInstallment(loanId, installmentNumber) {
  const loan = state.loans.find(item => item.id === loanId);
  if (!loan) return;

  if (!Array.isArray(loan.installments) || !loan.installments.length) {
    loan.installments = [{
      number: 1,
      value: Number(loan.value) || 0,
      dueDate: loan.firstDueDate || loan.date || "",
      paid: false,
      paidAt: null
    }];
  }

  const installment = loan.installments.find(item => item.number === installmentNumber);
  if (!installment) return;
  installment.paid = !installment.paid;
  installment.paidAt = installment.paid ? today : null;
  save();
}
window.toggleInstallment = toggleInstallment;

function renderDashboard() {
  const entriesMonth = totalByType("entrada", t => monthKey(t.date) === currentMonth);
  const expensesMonth = totalByType("saida", t => monthKey(t.date) === currentMonth);
  const investmentsTotal = state.investments.reduce((sum, i) => sum + Number(i.value), 0);

  document.getElementById("saldoAtual").textContent = currency.format(transactionBalance());
  document.getElementById("entradasMes").textContent = currency.format(entriesMonth);
  document.getElementById("saidasMes").textContent = currency.format(expensesMonth);
  document.getElementById("totalInvestimentos").textContent = currency.format(investmentsTotal);

  renderRecent();
  renderUpcoming();
  renderGoalCard();
  renderCharts();
}

function renderRecent() {
  const rows = state.transactions.slice(0, 8).map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td><span class="badge ${t.type === "entrada" ? "income" : "expense"}">${t.type === "entrada" ? "Entrada" : "Saída"}</span></td>
      <td class="money ${t.type === "entrada" ? "income" : "expense"}">${t.type === "entrada" ? "+" : "-"} ${currency.format(t.value)}</td>
    </tr>
  `).join("");
  document.getElementById("recentTable").innerHTML = rows || `<tr><td colspan="5" class="empty">Nenhuma movimentação cadastrada.</td></tr>`;
}

function renderTransactions() {
  const rows = state.transactions.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td><span class="badge ${t.type === "entrada" ? "income" : "expense"}">${t.type === "entrada" ? "Entrada" : "Saída"}</span></td>
      <td class="money ${t.type === "entrada" ? "income" : "expense"}">${t.type === "entrada" ? "+" : "-"} ${currency.format(t.value)}</td>
      <td><button class="delete-btn" onclick="deleteFrom('transactions','${t.id}')">Excluir</button></td>
    </tr>
  `).join("");
  document.getElementById("transactionsTable").innerHTML = rows || `<tr><td colspan="6" class="empty">Nenhuma movimentação cadastrada.</td></tr>`;
}

function renderDaily() {
  const date = document.getElementById("dailyDate").value || today;
  const tx = state.transactions.filter(t => t.date === date);
  const income = tx.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.value), 0);
  const expense = tx.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.value), 0);

  document.getElementById("dailyIncome").textContent = currency.format(income);
  document.getElementById("dailyExpense").textContent = currency.format(expense);
  document.getElementById("dailyBalance").textContent = currency.format(income - expense);

  document.getElementById("dailyList").innerHTML = tx.map(t => `
    <div class="list-item">
      <div><strong>${t.description}</strong><small>${t.category} • ${t.payment || "—"}</small></div>
      <strong class="money ${t.type === "entrada" ? "income" : "expense"}">${t.type === "entrada" ? "+" : "-"} ${currency.format(t.value)}</strong>
    </div>
  `).join("") || `<div class="empty">Nenhum lançamento nesta data.</div>`;
}

function renderMonthly() {
  const month = document.getElementById("monthlyDate").value || currentMonth;
  const tx = state.transactions.filter(t => monthKey(t.date) === month);
  const income = tx.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.value), 0);
  const expense = tx.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.value), 0);

  document.getElementById("monthlyIncome").textContent = currency.format(income);
  document.getElementById("monthlyExpense").textContent = currency.format(expense);
  document.getElementById("monthlyBalance").textContent = currency.format(income - expense);

  const byCategory = {};
  tx.filter(t => t.type === "saida").forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.value);
  });

  document.getElementById("monthlyCategories").innerHTML = Object.entries(byCategory)
    .map(([name, value]) => `<div class="summary-card"><span class="panel-kicker">${name}</span><h2>${currency.format(value)}</h2></div>`)
    .join("") || `<div class="empty">Sem despesas neste mês.</div>`;
}

function renderUpcoming() {
  const items = [
    ...state.fixedBills.map(i => ({...i, type: "Conta fixa"})),
    ...state.subscriptions.map(i => ({...i, type: "Assinatura"}))
  ].sort((a,b) => a.day - b.day).slice(0, 6);

  document.getElementById("upcomingList").innerHTML = items.map(i => `
    <div class="list-item">
      <div><strong>${i.name}</strong><small>${i.type} • dia ${i.day}</small></div>
      <strong>${currency.format(i.value)}</strong>
    </div>
  `).join("") || `<div class="empty">Nenhuma conta recorrente cadastrada.</div>`;
}


let activeGoalId = null;

function ensureGoalShape(goal) {
  if (!goal.movements) goal.movements = [];
  goal.current = Number(goal.current || 0);
  goal.target = Number(goal.target || 0);
  return goal;
}

state.goals.forEach(ensureGoalShape);

function getGoalById(goalId) {
  return state.goals.find(g => g.id === goalId);
}

function openGoalContribution(goalId, source = "manual") {
  const goal = getGoalById(goalId);
  if (!goal) return;

  activeGoalId = goalId;

  document.getElementById("goalContributionArea").classList.remove("hidden");
  document.getElementById("goalEditArea").classList.add("hidden");
  document.getElementById("goalActionTitle").textContent = `Adicionar valor — ${goal.name}`;
  document.getElementById("goalSelectedInfo").textContent =
    `Acumulado: ${currency.format(goal.current)} • Objetivo: ${currency.format(goal.target)} • Falta: ${currency.format(Math.max(0, goal.target - goal.current))}`;

  document.getElementById("goalContributionValue").value = "";
  document.getElementById("goalContributionSource").value = source;
  document.getElementById("goalContributionDate").value = today;
  document.getElementById("goalContributionNote").value = "";
  updateGoalSourceHelp();

  document.getElementById("goalActionModal").classList.add("open");
}

function openGoalEdit(goalId) {
  const goal = getGoalById(goalId);
  if (!goal) return;

  activeGoalId = goalId;

  document.getElementById("goalContributionArea").classList.add("hidden");
  document.getElementById("goalEditArea").classList.remove("hidden");
  document.getElementById("goalActionTitle").textContent = `Editar meta — ${goal.name}`;

  document.getElementById("editGoalName").value = goal.name;
  document.getElementById("editGoalTarget").value = goal.target;
  document.getElementById("editGoalDeadline").value = goal.deadline;
  document.getElementById("editGoalCurrent").value = goal.current;

  document.getElementById("goalActionModal").classList.add("open");
}

function closeGoalActionModal() {
  document.getElementById("goalActionModal").classList.remove("open");
  activeGoalId = null;
}

function updateGoalSourceHelp() {
  const source = document.getElementById("goalContributionSource")?.value;
  const help = document.getElementById("goalSourceHelp");
  if (!help) return;

  if (source === "saldo") {
    help.innerHTML = `O valor será retirado do seu saldo disponível e registrado como uma <strong>saída</strong> na categoria "Metas financeiras".`;
  } else {
    help.textContent = "Esta opção aumenta o valor acumulado da meta sem alterar o saldo geral.";
  }
}

document.getElementById("closeGoalAction")?.addEventListener("click", closeGoalActionModal);

document.getElementById("goalActionModal")?.addEventListener("click", e => {
  if (e.target.id === "goalActionModal") closeGoalActionModal();
});

document.getElementById("goalContributionSource")?.addEventListener("change", updateGoalSourceHelp);

document.getElementById("goalContributionForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const goal = getGoalById(activeGoalId);
  if (!goal) return;

  ensureGoalShape(goal);

  const value = Number(document.getElementById("goalContributionValue").value);
  const source = document.getElementById("goalContributionSource").value;
  const date = document.getElementById("goalContributionDate").value;
  const note = document.getElementById("goalContributionNote").value.trim();

  if (!value || value <= 0) return;

  if (source === "saldo") {
    const availableBalance = transactionBalance();

    if (value > availableBalance) {
      alert(`Saldo insuficiente. Seu saldo atual é ${currency.format(availableBalance)}.`);
      return;
    }

    if (!state.categories.includes("Metas financeiras")) {
      state.categories.push("Metas financeiras");
    }

    state.transactions.unshift({
      id: crypto.randomUUID(),
      type: "saida",
      description: `Aporte para meta: ${goal.name}`,
      category: "Metas financeiras",
      value,
      date,
      payment: "Saldo atual",
      note: note || "Valor transferido do saldo para uma meta financeira"
    });
  }

  goal.current += value;
  goal.movements.unshift({
    id: crypto.randomUUID(),
    type: "aporte",
    source,
    value,
    date,
    note
  });

  closeGoalActionModal();
  save();
});

document.getElementById("goalEditForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const goal = getGoalById(activeGoalId);
  if (!goal) return;

  goal.name = document.getElementById("editGoalName").value.trim();
  goal.target = Number(document.getElementById("editGoalTarget").value);
  goal.deadline = document.getElementById("editGoalDeadline").value;
  goal.current = Number(document.getElementById("editGoalCurrent").value);

  closeGoalActionModal();
  save();
});

window.openGoalContribution = openGoalContribution;
window.openGoalEdit = openGoalEdit;

function renderGoalCard() {
  const goal = state.goals[0];
  const el = document.getElementById("goalCard");

  if (!goal) {
    el.innerHTML = `<div class="empty">Cadastre sua primeira meta financeira.</div>`;
    return;
  }

  ensureGoalShape(goal);

  const pct = Math.min(100, goal.target ? (goal.current / goal.target) * 100 : 0);
  el.innerHTML = `
    <div class="goal-box">
      <div class="goal-line"><strong>${goal.name}</strong><strong>${pct.toFixed(1)}%</strong></div>
      <div class="progress"><div style="width:${pct}%"></div></div>
      <div class="goal-line"><span>Acumulado</span><strong>${currency.format(goal.current)}</strong></div>
      <div class="goal-line"><span>Objetivo</span><strong>${currency.format(goal.target)}</strong></div>
      <div class="goal-line"><span>Falta</span><strong>${currency.format(Math.max(0, goal.target - goal.current))}</strong></div>
      <div class="goal-line"><span>Prazo</span><strong>${formatDate(goal.deadline)}</strong></div>

      <div class="goal-actions">
        <button class="goal-action-btn primary" onclick="openGoalContribution('${goal.id}', 'manual')">+ Adicionar valor</button>
        <button class="goal-action-btn" onclick="openGoalContribution('${goal.id}', 'saldo')">Usar saldo atual</button>
        <button class="goal-action-btn" onclick="openGoalEdit('${goal.id}')">Editar</button>
      </div>
    </div>
  `;
}

let cashflowChart;
let categoryChart;

function renderCharts() {
  const monthLabels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    monthLabels.push(label);
    incomeData.push(totalByType("entrada", t => monthKey(t.date) === key));
    expenseData.push(totalByType("saida", t => monthKey(t.date) === key));
  }

  if (cashflowChart) cashflowChart.destroy();
  cashflowChart = new Chart(document.getElementById("cashflowChart"), {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        { label: "Entradas", data: incomeData },
        { label: "Saídas", data: expenseData }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5df" } } },
      scales: {
        x: { ticks: { color: "#91a0af" }, grid: { color: "#202a35" } },
        y: { ticks: { color: "#91a0af" }, grid: { color: "#202a35" } }
      }
    }
  });

  const expenses = state.transactions.filter(t => t.type === "saida");
  const grouped = {};
  expenses.forEach(t => grouped[t.category] = (grouped[t.category] || 0) + Number(t.value));

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(grouped).length ? Object.keys(grouped) : ["Sem dados"],
      datasets: [{ data: Object.keys(grouped).length ? Object.values(grouped) : [1] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#cbd5df" } } }
    }
  });
}

function renderCollections() {
  document.getElementById("fixedBillList").innerHTML = state.fixedBills.map(i => `
    <div class="list-item"><div><strong>${i.name}</strong><small>Vence dia ${i.day}</small></div><div><strong>${currency.format(i.value)}</strong> <button class="delete-btn" onclick="deleteFrom('fixedBills','${i.id}')">Excluir</button></div></div>
  `).join("") || `<div class="empty">Nenhuma conta fixa.</div>`;

  document.getElementById("subscriptionList").innerHTML = state.subscriptions.map(i => `
    <div class="list-item"><div><strong>${i.name}</strong><small>Cobrança dia ${i.day}</small></div><div><strong>${currency.format(i.value)}</strong> <button class="delete-btn" onclick="deleteFrom('subscriptions','${i.id}')">Excluir</button></div></div>
  `).join("") || `<div class="empty">Nenhuma assinatura.</div>`;

  document.getElementById("cardList").innerHTML = state.cards.map(i => `
    <div class="summary-card"><span class="panel-kicker">Vencimento dia ${i.dueDay}</span><h2>${i.name}</h2><p>Limite: ${currency.format(i.limit)}</p><button class="delete-btn" onclick="deleteFrom('cards','${i.id}')">Excluir</button></div>
  `).join("") || `<div class="empty">Nenhum cartão.</div>`;

  document.getElementById("loanList").innerHTML = state.loans.map(i => {
    const installments = Array.isArray(i.installments) && i.installments.length
      ? i.installments
      : [{ number: 1, value: Number(i.value) || 0, dueDate: i.firstDueDate || i.date || "", paid: false, paidAt: null }];
    const paidCount = installments.filter(p => p.paid).length;
    const paidValue = installments.filter(p => p.paid).reduce((sum, p) => sum + Number(p.value), 0);
    const remainingValue = Math.max(0, Number(i.value) - paidValue);
    const progress = installments.length ? (paidCount / installments.length) * 100 : 0;

    return `
      <div class="loan-card">
        <div class="loan-card-header">
          <div>
            <span class="panel-kicker">${i.type === "recebido" ? "Dívida / empréstimo recebido" : "Empréstimo concedido"}</span>
            <h2>${i.name}</h2>
          </div>
          <button class="delete-btn" onclick="deleteFrom('loans','${i.id}')">Excluir dívida</button>
        </div>
        <div class="loan-summary-grid">
          <div><span>Valor total</span><strong>${currency.format(i.value)}</strong></div>
          <div><span>Parcelas</span><strong>${paidCount}/${installments.length} pagas</strong></div>
          <div><span>Já pago</span><strong>${currency.format(paidValue)}</strong></div>
          <div><span>Saldo restante</span><strong>${currency.format(remainingValue)}</strong></div>
        </div>
        <div class="progress loan-progress"><div style="width:${progress}%"></div></div>
        <div class="installments-table-wrap">
          <table class="installments-table">
            <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              ${installments.map(p => `
                <tr>
                  <td>${p.number}ª</td>
                  <td>${formatDate(p.dueDate)}</td>
                  <td>${currency.format(p.value)}</td>
                  <td><span class="badge ${p.paid ? "income" : "expense"}">${p.paid ? "Paga" : "Pendente"}</span></td>
                  <td><button class="installment-btn" onclick="toggleInstallment('${i.id}', ${p.number})">${p.paid ? "Marcar pendente" : "Marcar paga"}</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join("") || `<div class="empty">Nenhuma dívida ou empréstimo cadastrado.</div>`;

  document.getElementById("investmentList").innerHTML = state.investments.map(i => `
    <div class="list-item"><div><strong>${i.name}</strong><small>${formatDate(i.date)}</small></div><div><strong>${currency.format(i.value)}</strong> <button class="delete-btn" onclick="deleteFrom('investments','${i.id}')">Excluir</button></div></div>
  `).join("") || `<div class="empty">Nenhum investimento.</div>`;

  document.getElementById("goalList").innerHTML = state.goals.map(i => {
    ensureGoalShape(i);
    const pct = Math.min(100, i.target ? (i.current / i.target) * 100 : 0);
    const history = (i.movements || []).slice(0, 3);

    return `
      <div class="summary-card">
        <span class="panel-kicker">${pct.toFixed(1)}% concluído</span>
        <h2>${i.name}</h2>
        <p><strong>${currency.format(i.current)}</strong> de ${currency.format(i.target)}</p>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <p>Falta: <strong>${currency.format(Math.max(0, i.target - i.current))}</strong></p>
        <p>Prazo: ${formatDate(i.deadline)}</p>

        <div class="goal-actions">
          <button class="goal-action-btn primary" onclick="openGoalContribution('${i.id}', 'manual')">+ Adicionar valor</button>
          <button class="goal-action-btn" onclick="openGoalContribution('${i.id}', 'saldo')">Usar saldo atual</button>
          <button class="goal-action-btn" onclick="openGoalEdit('${i.id}')">Editar meta</button>
          <button class="delete-btn" onclick="deleteFrom('goals','${i.id}')">Excluir</button>
        </div>

        ${history.length ? `
          <div class="goal-history">
            ${history.map(m => `
              <div class="goal-history-item">
                <span>${formatDate(m.date)} • ${m.source === "saldo" ? "Do saldo" : "Entrada manual"}</span>
                <strong>+ ${currency.format(m.value)}</strong>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }).join("") || `<div class="empty">Nenhuma meta financeira.</div>`;

  document.getElementById("categoryList").innerHTML = state.categories.map(i => `<span class="chip">${i}</span>`).join("");
}

function renderAll() {
  fillCategories();
  renderDashboard();
  renderTransactions();
  renderDaily();
  renderMonthly();
  renderCollections();
}

renderAll();
