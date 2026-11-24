const $ = id => document.getElementById(id);

const STORAGE_KEY = "nightreapers_v1";

// ========================================
//             DATA & STORAGE
// ========================================

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.routes)) return saved;
  } catch (error) {
    console.warn("Could not load saved records", error);
  }
  return {
    routes: [],
    active: null,
    vehicle: null,
    settings: { rate: 0, weekStart: 5 }
  };
}

let data = loadData();

// ============ EARNINGS PRIVACY ============

// Display-only preference. Pay calculations and saved shift data are unchanged.
if (typeof data.earningsHidden !== "boolean") data.earningsHidden = false;

function updateEarningsVisibility() {
  const hidden = data.earningsHidden;
  const button = $("earningsVisibilityBtn");
  const icon = $("earningsEyeIcon");
  const action = hidden ? "Reveal" : "Hide";

  button.setAttribute("aria-label", `${action} estimated earnings`);
  button.setAttribute("aria-pressed", String(hidden));
  button.title = `${action} estimated earnings`;

  // Eye = visible; crossed-out eye = hidden.
  icon.innerHTML = hidden
    ? '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15.5 15.5 0 0 1-3.3 4.2"/><path d="M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.2-.9"/><path d="M10 10a3 3 0 0 0 4 4"/>'
    : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>';
}

$("earningsVisibilityBtn").addEventListener("click", () => {
  data.earningsHidden = !data.earningsHidden;
  save();
  render();
});

// Preserve existing v1 records while introducing a saved-vehicle garage.
if (!Array.isArray(data.vehicles)) data.vehicles = [];
if (!data.settings || typeof data.settings !== "object") {
  data.settings = { rate: 0, weekStart: 5 };
}

let editingVehicleId = null;

/* ============ SAVED ROUTE STORAGE ============ */

// Keep existing shift history separate from saved route presets.
if (!Array.isArray(data.savedRoutes)) {
  data.savedRoutes = [];
}

// No saved route is selected until the user chooses one.
if (data.selectedRouteId === undefined) {
  data.selectedRouteId = null;
}

let editingRouteId = null;

// Store a vehicle assignment for each saved route.
// Existing completed reports remain independent of these assignments.
if (!data.routeVehicleIds || typeof data.routeVehicleIds !== "object" ||
    Array.isArray(data.routeVehicleIds)) {
  data.routeVehicleIds = {};
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ========================================
//              FORMAT HELPERS
// ========================================

function money(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount);
}

function duration(ms) {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function timer(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function dateText(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function timeText(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-CA", {
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

// ============ PAYROLL WEEK ============

function weekBounds(timestamp = Date.now()) {
  const now = new Date(timestamp);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  const weekStart = Number((data.settings.weekStart == null ? 5 : data.settings.weekStart));
  start.setDate(start.getDate() - (day - weekStart + 7) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return [start.getTime(), end.getTime()];
}

// ========================================
//                DASHBOARD
// ========================================

function render() {
  updateEarningsVisibility();
  const [from, to] = weekBounds();
  const weekly = data.routes.filter(r => r.start >= from && r.start < to);
  const km = weekly.reduce((sum, r) => sum + r.endKm - r.startKm, 0);
  const linked = new Set(allWorkdays().flatMap(w => w.tasks.map(t => t.routeId).filter(Boolean)));
  let hoursMs = allWorkdays().reduce((sum,w)=>sum+paidMs(w,from,to),0);
  let gross = hoursMs / 3600000 * (Number(data.settings.rate)||0);
  weekly.filter(r=>!linked.has(r.id)).forEach(r=>{hoursMs+=r.end-r.start;gross+=Number(r.gross)||0;});
  if(data.active && !linked.has(data.active.id) && data.active.start>=from && data.active.start<to){const ms=Date.now()-data.active.start;hoursMs+=ms;gross+=ms/3600000*data.active.rate;}
  $("weeklyGross").textContent = data.earningsHidden ? "••••••" : money(gross);
  $("weeklyHours").textContent = duration(hoursMs);
  $("weeklyKm").textContent = `${km.toLocaleString("en-CA")} km`;
  $("weeklyRoutes").textContent = weekly.length;

  const endDate = new Date(to - 1);
  $("payPeriod").textContent =
    `${dateText(from)} – ${endDate.toLocaleDateString("en-CA", {month:"short",day:"numeric"})}`;

  $("startBtn").disabled = !!data.active;
  $("endBtn").disabled = !data.active;
  $("activePanel").hidden = !data.active || $("workControls").hidden;
  $("routeModeControls").hidden = !data.active;

  if (data.active) {
    $("routeTimer").textContent = timer(Date.now() - data.active.start);
    $("activeTruck").textContent =
      `Truck ${data.active.truck} • ${data.active.plate}`;
    $("livePay").textContent = data.earningsHidden
      ? "••••••"
      : money((Date.now() - data.active.start) / 3600000 * data.active.rate);
  }

  renderWork();
  renderHistory();
}


// ============ ROUTE HISTORY ============

// UI-only state: keep the expanded list open during dashboard timer refreshes.
let historyExpanded = false;

function renderHistory() {
  const viewAllButton = $("viewAllBtn");
  viewAllButton.textContent = historyExpanded ? "Show Less ‹" : "View All ›";
  viewAllButton.setAttribute("aria-expanded", String(historyExpanded));
  const container = $("routeHistory");
  container.replaceChildren();

  const routes = [...data.routes].sort((a, b) => b.start - a.start);
  const visible = historyExpanded ? routes : routes.slice(0, 3);

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No completed routes yet.";
    container.appendChild(empty);
    return;
  }

  for (const route of visible) {
    const item = document.createElement("div");
    item.className = "history-item";

    const report = document.createElement("button");
    report.className = "history-report";
    report.type = "button";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "right";

    const title = document.createElement("strong");
    title.textContent = dateText(route.start);

    const details = document.createElement("small");
    details.textContent = `Route ${route.routeNumber || "0000"} • Truck ${route.truck} • ${route.plate}`;

    const elapsed = document.createElement("strong");
    elapsed.textContent = duration(route.end - route.start);

    const distance = document.createElement("small");
    distance.textContent = `${route.endKm - route.startKm} km`;

    left.append(title, details);
    right.append(elapsed, distance);
    report.append(left, right);

    report.addEventListener("click", () => showReport(route));
    item.appendChild(report);

    // Only the most recent completed route can be deleted.
    if (route === routes[0] && !allWorkdays().some(w=>w.tasks.some(t=>t.routeId===route.id))) {
      const trash = document.createElement("button");
      trash.type = "button";
      trash.className = "delete-route";
      trash.textContent = "×";
      trash.title = "Delete most recent route";
      trash.setAttribute("aria-label", "Delete most recent route");

      trash.addEventListener("click", () => {
        const date = dateText(route.start);

        if (!confirm(`Delete route from ${date}?\n\nThis cannot be undone.`)) {
          return;
        }

        data.routes = data.routes.filter(r => r.id !== route.id);
        save();
        render();
      });

      item.appendChild(trash);
    }

    container.appendChild(item);
  }
}


// ========================================
//              ROUTE TRACKING
// ========================================

// ============ START ROUTE ============

// ============ ROUTE SELECTOR ============

function populateStartRouteSelect() {
  const select = $("startRouteSelect");
  select.replaceChildren();

  // Route 0000 is always the first entry.
  select.add(new Option("Route 0000 — No Route Selected", ""));

  for (const route of data.savedRoutes) {
    if (String(route.number).trim() === "0000") continue;
    const label = route.nickname
      ? `Route ${route.number} — ${route.nickname}`
      : `Route ${route.number}`;
    select.add(new Option(label, route.id));
  }

  select.value = data.selectedRouteId || "";
  if (select.selectedIndex === -1) select.value = "";
}

// ============ ASSIGNED VEHICLE ============

function getStartVehicle() {
  const routeId = $("startRouteSelect").value;
  const selectedVehicle = data.vehicles.find(
    vehicle => vehicle.id === data.selectedVehicleId
  ) || null;

  // Route 0000 always uses the vehicle selected in Vehicle Information.
  if (!routeId) return selectedVehicle;

  const route = data.savedRoutes.find(savedRoute => savedRoute.id === routeId);
  if (!route) return null;

  // Respect a previously saved assignment when the vehicle still exists.
  const assigned = data.vehicles.find(
    vehicle => vehicle.id === data.routeVehicleIds[routeId]
  );
  if (assigned) return assigned;

  // Saved routes require an explicit vehicle assignment.
  // A route number identifies the route, not the physical truck.
  return null;
}

function updateStartVehicleDisplay() {
  const vehicle = getStartVehicle();
  const display = $("startVehicleDisplay");
  display.replaceChildren();

  if (vehicle) {
    const name = document.createElement("strong");
    name.textContent = vehicle.nickname || `Truck ${vehicle.truck}`;

    const details = document.createElement("span");
    details.textContent = `Truck ${vehicle.truck} • ${vehicle.plate}`;

    display.append(name, details);
  } else {
    display.textContent = "No vehicle selected.";
  }

  $("startVehicleHint").hidden = !!vehicle;
  $("startVehicleHint").textContent = $("startRouteSelect").value
    ? "No vehicle assigned to this route. Open Settings → Route Information and assign a saved vehicle."
    : "Select a vehicle in Settings → Vehicle Information before starting a route.";
  $("confirmStartRouteBtn").disabled = !vehicle;
}

$("startRouteSelect").addEventListener("change", updateStartVehicleDisplay);

$("startBtn").addEventListener("click", () => {
  if (data.active || !data.workday || currentTask().type === "Break") return;

  $("startKm").value = "";
  populateStartRouteSelect();
  updateStartVehicleDisplay();
  $("startDialog").showModal();
});

// ============ SAVE ACTIVE SHIFT ============

$("startForm").addEventListener("submit", event => {
  event.preventDefault();
  if (data.active) return;

  const vehicle = getStartVehicle();
  const startKm = Number($("startKm").value);
  if (!vehicle || $("startKm").value === "" ||
      !Number.isFinite(startKm) || startKm < 0) {
    updateStartVehicleDisplay();
    return;
  }

  const routeId = $("startRouteSelect").value;
  const selectedRoute = data.savedRoutes.find(route => route.id === routeId);

  // Save the vehicle used for this route, without modifying past reports.
  if (selectedRoute) data.routeVehicleIds[selectedRoute.id] = vehicle.id;

  // Remember the route picked in this dialog for the next shift.
  data.selectedRouteId = selectedRoute ? selectedRoute.id : null;

  data.active = {
    id: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    truck: vehicle.truck,
    plate: vehicle.plate,
    startKm,
    routeNumber: (selectedRoute && selectedRoute.number) || "0000",
    start: Date.now(),
    rate: Number(data.settings.rate) || 0
  };

  switchTask("Route 6184", data.active.start, data.active.id);
  save();
  $("startDialog").close();
  render();
});

// ============ END ROUTE ============

$("endBtn").addEventListener("click", () => {
  if (!data.active) return;
  $("endKm").value = "";
  $("routeNotes").value = "";
  $("endDialog").showModal();
});

$("endForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!data.active) return;

  const endKm = Number($("endKm").value);
  if (!Number.isFinite(endKm) || endKm < data.active.startKm) {
    alert("Ending kilometres cannot be lower than starting kilometres.");
    return;
  }
  
  const end = Date.now();

  const route = {
    ...data.active,
    end,
    endKm,
    routeNumber: data.active.routeNumber || "0000",
    notes: $("routeNotes").value.trim(),
    gross: (end - data.active.start) / 3600000 * data.active.rate
  };


  data.routes.push(route);
  data.active = null;
  if(data.workday) switchTask("Unassigned",end);
  save();
  $("endDialog").close();
  render();
  showReport(route);
});


// ========================================
//            SCREEN NAVIGATION
// ========================================

function showDashboard() {
  $("settingsScreen").hidden = true;
  $("vehicleScreen").hidden = true;  
  $("routeScreen").hidden = true;

  
  document.querySelector(".earnings").hidden = false;
  document.querySelector(".controls").hidden = false;
  document.querySelector(".history").hidden = false;
  $("taskHistoryPanel").hidden = false;
  $("settingsBtn").hidden = false;
  render();
}

function showSettings() {
  $("vehicleScreen").hidden = true;
  $("routeScreen").hidden = true;
  $("settingsScreen").hidden = false;

  document.querySelector(".earnings").hidden = true;
  document.querySelector(".controls").hidden = true;
  document.querySelector(".history").hidden = true;
  $("taskHistoryPanel").hidden = true;

  $("activePanel").hidden = true;
  $("settingsBtn").hidden = true;
}

$("settingsBtn").addEventListener("click", showSettings);
$("backDashboardBtn").addEventListener("click", showDashboard);
$("backVehicleSettingsBtn").addEventListener("click", showSettings);

$("payInfoBtn").addEventListener("click", () => {
  $("hourlyRate").value = (data.settings.rate == null ? 0 : data.settings.rate);
  $("weekStart").value = String((data.settings.weekStart == null ? 5 : data.settings.weekStart));
  $("settingsDialog").showModal();
});

/* ============ VEHICLE INFORMATION ============ */
$("vehicleInfoBtn").addEventListener("click", () => {
  $("settingsScreen").hidden = true;
  $("vehicleScreen").hidden = false;
  renderVehicles();
});

/* ============ ROUTE INFORMATION ============ */

$("routeInfoBtn").addEventListener("click", () => {
  $("settingsScreen").hidden = true;
  $("routeScreen").hidden = false;
  populateRouteVehicleSelect();
  renderRoutes();
});


$("backRouteSettingsBtn").addEventListener("click", showSettings);

// ========================================
//         EDIT MOST RECENT SHIFT
// ========================================

// Match the dashboard's definition of the most recent completed shift.
function mostRecentCompletedShift() {
  return [...data.routes].sort((a, b) => b.start - a.start)[0] || null;
}

// datetime-local uses the device's local timezone, not UTC.
function toLocalDateTimeInput(timestamp) {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

$("editHistoryBtn").addEventListener("click", () => {
  const route = mostRecentCompletedShift();
  const fields = $("editHistoryFields");
  const submit = $("saveEditHistoryBtn");
  fields.hidden = !route;
  submit.hidden = !route;

  if (!route) {
    $("editHistoryShiftLabel").textContent = "No completed shifts to edit.";
  } else {
    $("editHistoryShiftLabel").textContent =
      `Most recent: ${dateText(route.start)} • Route ${route.routeNumber || "0000"}`;
    $("editHistoryRouteNumber").value = route.routeNumber || "0000";
    $("editHistoryTruck").value = route.truck || "";
    $("editHistoryPlate").value = route.plate || "";
    $("editHistoryStartKm").value = route.startKm;
    $("editHistoryEndKm").value = route.endKm;
    $("editHistoryStart").value = toLocalDateTimeInput(route.start);
    $("editHistoryEnd").value = toLocalDateTimeInput(route.end);
    $("editHistoryNotes").value = route.notes || "";
  }
  $("editHistoryDialog").showModal();
});

$("editHistoryForm").addEventListener("submit", event => {
  event.preventDefault();
  const route = mostRecentCompletedShift();
  if (!route) return;

  const routeNumber = $("editHistoryRouteNumber").value.trim();
  const truck = $("editHistoryTruck").value.trim();
  const plate = $("editHistoryPlate").value.trim();
  const startKmText = $("editHistoryStartKm").value;
  const endKmText = $("editHistoryEndKm").value;
  const startKm = Number(startKmText);
  const endKm = Number(endKmText);
  const start = new Date($("editHistoryStart").value).getTime();
  const end = new Date($("editHistoryEnd").value).getTime();

  if (!routeNumber || !truck || !plate || !startKmText || !endKmText ||
      !Number.isFinite(startKm) || !Number.isFinite(endKm) ||
      startKm < 0 || endKm < startKm ||
      !Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    alert("Check the fields: ending kilometres and time must not be earlier than starting values.");
    return;
  }

  const linkedWork = allWorkdays().find(w=>w.tasks.some(t=>t.routeId===route.id));
  if(linkedWork && (start!==Math.floor(route.start/60000)*60000 || end!==Math.floor(route.end/60000)*60000)){alert("Linked route times are locked to preserve the workday timeline. Odometer and notes may be edited.");return;}
  // Update the same completed record; leave vehicle/route presets and active shift alone.
  Object.assign(route, {
    routeNumber, truck, plate, startKm, endKm, start:linkedWork?route.start:start, end:linkedWork?route.end:end,
    notes: $("editHistoryNotes").value.trim(),
    gross: (end - start) / 3600000 * (Number(route.rate) || 0)
  });
  save();
  $("editHistoryDialog").close();
  render();
});

// ============ PAY INFORMATION ============

$("settingsForm").addEventListener("submit", event => {
  event.preventDefault();
  data.settings.rate = Number($("hourlyRate").value);
  data.settings.weekStart = Number($("weekStart").value);
  save();
  $("settingsDialog").close();
  render();
});

// ========================================
//             VEHICLE GARAGE
// ========================================

function clearVehicleForm() {
  editingVehicleId = null;
  $("vehicleForm").reset();
  $("vehicleForm").querySelector('button[type="submit"]').textContent = "SAVE VEHICLE";
}

function renderVehicles() {
  const selected = data.vehicles.find(vehicle => vehicle.id === data.selectedVehicleId);
  $("currentVehicleDisplay").textContent = selected
    ? `${selected.nickname || `Truck ${selected.truck}`} • ${selected.plate}`
    : "No vehicle selected.";

  const list = $("savedVehiclesList");
  list.replaceChildren();
  if (!data.vehicles.length) {
    list.textContent = "No saved vehicles yet.";
    return;
  }

  for (const vehicle of data.vehicles) {
    const item = document.createElement("div");
    item.style.marginBottom = "12px";

    const label = document.createElement("div");
    label.textContent = `${vehicle.nickname || `Truck ${vehicle.truck}`} — ${vehicle.truck} • ${vehicle.plate}`;
    label.style.marginBottom = "8px";
    item.appendChild(label);

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    actions.style.marginTop = "0";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "start";
    useButton.textContent = vehicle.id === data.selectedVehicleId ? "SELECTED" : "SELECT";
    useButton.disabled = vehicle.id === data.selectedVehicleId;
    useButton.addEventListener("click", () => {
      data.selectedVehicleId = vehicle.id;
      data.vehicle = { truck: vehicle.truck, plate: vehicle.plate };
      save();
      renderVehicles();
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "cancel";
    editButton.textContent = "EDIT";
    editButton.addEventListener("click", () => {
      editingVehicleId = vehicle.id;
      $("vehicleNickname").value = vehicle.nickname;
      $("vehicleTruckNumber").value = vehicle.truck;
      $("vehiclePlate").value = vehicle.plate;
      $("vehicleForm").querySelector('button[type="submit"]').textContent = "UPDATE VEHICLE";
      $("vehicleNickname").focus();
    });

    // ============ REMOVE VEHICLE ============

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "end";
    removeButton.textContent = "REMOVE";

    removeButton.addEventListener("click", () => {
      data.vehicles = data.vehicles.filter(
        savedVehicle => savedVehicle.id !== vehicle.id
      );

      if (data.selectedVehicleId === vehicle.id) {
        data.selectedVehicleId = null;
        data.vehicle = null;
      }

      if (editingVehicleId === vehicle.id) {
        clearVehicleForm();
      }

      // Remove references to this vehicle from saved route assignments.
      for (const [routeId, vehicleId] of Object.entries(data.routeVehicleIds)) {
        if (vehicleId === vehicle.id) delete data.routeVehicleIds[routeId];
      }

      save();
      renderVehicles();
    });

    actions.append(useButton, editButton, removeButton);
    item.appendChild(actions);
    list.appendChild(item);
  }
}

$("cancelVehicleEdit").addEventListener("click", clearVehicleForm);

$("vehicleForm").addEventListener("submit", event => {
  event.preventDefault();
  const nickname = $("vehicleNickname").value.trim();
  const truck = $("vehicleTruckNumber").value.trim();
  const plate = $("vehiclePlate").value.trim();
  if (!truck || !plate) return;

  if (editingVehicleId) {
    const existing = data.vehicles.find(vehicle => vehicle.id === editingVehicleId);
    if (existing) Object.assign(existing, { nickname, truck, plate });
  } else {
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    data.vehicles.push({ id, nickname, truck, plate });
    if (!data.selectedVehicleId) data.selectedVehicleId = id;
  }

  const selected = data.vehicles.find(vehicle => vehicle.id === data.selectedVehicleId);
  if (selected) data.vehicle = { truck: selected.truck, plate: selected.plate };
  save();
  clearVehicleForm();
  renderVehicles();
});

// ========================================
//              ROUTE GARAGE
// ========================================

// ============ ROUTE DISPLAY ============

function renderRoutes() {
  const selected = data.savedRoutes.find(
    route => route.id === data.selectedRouteId
  );

  $("currentRouteDisplay").textContent = selected
    ? `Route ${selected.number}${selected.nickname ? ` — ${selected.nickname}` : ""}`
    : "No route selected.";

  const list = $("savedRoutesList");
  list.replaceChildren();

  if (!data.savedRoutes.length) {
    list.textContent = "No saved routes yet.";
    return;
  }

  for (const route of data.savedRoutes) {
    const item = document.createElement("div");
    item.className = "saved-route-item";
    item.style.marginBottom = "12px";

    const label = document.createElement("div");
    label.textContent =
      `Route ${route.number}${route.nickname ? ` — ${route.nickname}` : ""}`;
    label.style.marginBottom = "8px";

    const assignedVehicle = data.vehicles.find(
      vehicle => vehicle.id === data.routeVehicleIds[route.id]
    );
    const assignment = document.createElement("small");
    assignment.className = "route-assignment-summary";
    assignment.textContent = assignedVehicle
      ? `Assigned: ${assignedVehicle.nickname || `Truck ${assignedVehicle.truck}`} • ${assignedVehicle.truck} • ${assignedVehicle.plate}`
      : "Assigned: No vehicle";
    label.appendChild(assignment);

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    // ===== SELECT ROUTE =====

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "start";
    selectBtn.textContent =
      route.id === data.selectedRouteId ? "SELECTED" : "SELECT";
    selectBtn.disabled = route.id === data.selectedRouteId;

    selectBtn.addEventListener("click", () => {
      data.selectedRouteId = route.id;
      save();
      renderRoutes();
    });

    // ===== EDIT ROUTE =====

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "cancel";
    editBtn.textContent = "EDIT";

    editBtn.addEventListener("click", () => {
      editingRouteId = route.id;
      $("routeNumber").value = route.number;
      $("routeNickname").value = route.nickname || "";
      populateRouteVehicleSelect(data.routeVehicleIds[route.id] || "");

      $("routeForm")
        .querySelector('button[type="submit"]')
        .textContent = "SAVE CHANGES";
    });

    // ============ REMOVE ROUTE ============

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "end";
    removeBtn.textContent = "REMOVE";

    removeBtn.addEventListener("click", () => {
      data.savedRoutes = data.savedRoutes.filter(
        savedRoute => savedRoute.id !== route.id
      );

      if (data.selectedRouteId === route.id) {
        data.selectedRouteId = null;
      }
      delete data.routeVehicleIds[route.id];

      if (editingRouteId === route.id) {
        clearRouteForm();
      }

      save();
      renderRoutes();
    });

    actions.append(selectBtn, editBtn, removeBtn);
    item.append(label, actions);
    list.appendChild(item);
  }
}

// ============ ROUTE FORM ============

function populateRouteVehicleSelect(selectedId = "") {
  const select = $("routeAssignedVehicle");
  select.replaceChildren();
  select.add(new Option("No vehicle assigned", ""));

  for (const vehicle of data.vehicles) {
    const name = vehicle.nickname || `Truck ${vehicle.truck}`;
    select.add(new Option(`${name} — ${vehicle.truck} • ${vehicle.plate}`, vehicle.id));
  }
  select.value = selectedId;
  if (select.selectedIndex === -1) select.value = "";
}

function clearRouteForm() {
  editingRouteId = null;
  $("routeForm").reset();
  populateRouteVehicleSelect();
  $("routeForm")
    .querySelector('button[type="submit"]')
    .textContent = "SAVE ROUTE";
}

$("cancelRouteEdit").addEventListener("click", clearRouteForm);

$("routeForm").addEventListener("submit", event => {
  event.preventDefault();

  const number = $("routeNumber").value.trim();
  const nickname = $("routeNickname").value.trim();
  const vehicleId = $("routeAssignedVehicle").value;

  if (!number) return;

  if (editingRouteId) {
    const existing = data.savedRoutes.find(
      route => route.id === editingRouteId
    );

    if (existing) {
      Object.assign(existing, { number, nickname });
      if (vehicleId) data.routeVehicleIds[existing.id] = vehicleId;
      else delete data.routeVehicleIds[existing.id];
    }
  } else {
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    data.savedRoutes.push({ id, number, nickname });
    if (vehicleId) data.routeVehicleIds[id] = vehicleId;

    if (!data.selectedRouteId) {
      data.selectedRouteId = id;
    }
  }

  save();
  clearRouteForm();
  renderRoutes();
});

// ============ DIALOG CONTROLS ============

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    $(button.dataset.close).close();
  });
});

// ========================================
//              SHIFT REPORTS
// ========================================

function addReportRow(container, label, value) {
  const row = document.createElement("div");
  row.className = "report-row";

  const left = document.createElement("strong");
  left.textContent = label;

  const right = document.createElement("span");
  right.textContent = value;

  row.append(left, right);
  container.appendChild(row);
}

function showReport(route) {
  const content = $("reportContent");
  content.replaceChildren();

  
  const title = document.createElement("h2");
  const routeNumber = route.routeNumber || "0000";
  title.textContent = `ROUTE ${routeNumber} — SHIFT REPORT`;
  content.appendChild(title);

  addReportRow(content, "Date", dateText(route.start));
  addReportRow(content, "Truck", route.truck);
  addReportRow(content, "Plate", route.plate);
  addReportRow(content, "Start", timeText(route.start));
  addReportRow(content, "End", timeText(route.end));
  addReportRow(content, "Duration", duration(route.end - route.start));
  addReportRow(content, "Starting KM", `${route.startKm} km`);
  addReportRow(content, "Ending KM", `${route.endKm} km`);
  addReportRow(content, "Distance", `${route.endKm - route.startKm} km`);

  if (route.notes) {
    const heading = document.createElement("h3");
    heading.textContent = "Vehicle Notes";
    const notes = document.createElement("p");
    notes.className = "notes";
    notes.textContent = route.notes;
    content.append(heading, notes);
  }

  $("reportDialog").showModal();
}


// ============ CLOSE CONFIRMATION ============

const reportDialog = $("reportDialog");

const reportConfirm = document.createElement("div");
reportConfirm.className = "report-confirm";
reportConfirm.innerHTML = `
  <div class="report-confirm-sheet">
    <div class="report-confirm-handle"></div>
    <h3>Your done looking?</h3>
    <p>Your completed route has been saved.</p>
    <div class="report-confirm-buttons">
      <button type="button" id="confirmCloseYes">Yuh, close</button>
      <button type="button" id="confirmCloseNo">Wait, hold on</button>
    </div>
  </div>
`;

reportDialog.appendChild(reportConfirm);

reportDialog.addEventListener("click", event => {
  if (event.target.closest(".report-confirm-sheet")) return;
  reportConfirm.classList.add("visible");
});

$("confirmCloseYes").addEventListener("click", () => {
  reportConfirm.classList.remove("visible");
  reportDialog.close();
});

$("confirmCloseNo").addEventListener("click", () => {
  reportConfirm.classList.remove("visible");
});

// ============ HISTORY EXPANSION ============

$("viewAllBtn").addEventListener("click", () => {
  historyExpanded = !historyExpanded;
  renderHistory();
});

// ============ BACKUP EXPORT ============

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NightReapers-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});


// ========================================
//              SLEEP MODE
// ========================================

const sleepScreen = $("sleepScreen");

$("sleepBtn").addEventListener("click", () => {
  if (!data.active) return;

  sleepScreen.hidden = false;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sleepScreen.classList.add("sleep-visible");
    });
  });
});

sleepScreen.addEventListener("click", () => {
  sleepScreen.classList.remove("sleep-visible");

  setTimeout(() => {
    sleepScreen.hidden = true;
  }, 1000);
});




// ========================================
//             STARTUP SCENE
// ========================================

// ============ REAPER BLINK ============

const startupReaper = document.getElementById("startupReaper");

if (startupReaper) {
  const eyesClosed = "assets/waiting-reaper/WR-1.png";
  const eyesOpen = "assets/waiting-reaper/WR-2.png";

  // Preload the second frame to avoid flickering.
  const openFrame = new Image();
  openFrame.src = eyesOpen;

  function blinkReaper() {
    startupReaper.src = eyesOpen;

    setTimeout(() => {
      startupReaper.src = eyesClosed;
    }, 800);
  }

  // Blink every 6 seconds.
  setInterval(blinkReaper, 6000);
}

// ============ STARTUP TRANSITION ============

const startupScreen = document.getElementById("startupScreen");

if (startupScreen) {
  const blackout = document.createElement("div");
  blackout.className = "startup-blackout";
  document.body.appendChild(blackout);

  setTimeout(() => {
    blackout.classList.add("visible");

    setTimeout(() => {
      startupScreen.style.display = "none";
      blackout.classList.remove("visible");

      setTimeout(() => {
        blackout.remove();
      }, 1000);
    }, 1000);
  }, 8000);
}

// ========================================
//              WAITING MODE
// ========================================

const waitingModeBtn = document.getElementById("waitingModeBtn");

if (waitingModeBtn && startupScreen) {
  waitingModeBtn.addEventListener("click", () => {
    if (!data.active) return;

    startupScreen.classList.remove("fade-out");
    startupScreen.style.opacity = "0";
    startupScreen.style.display = "block";
    startupScreen.style.pointerEvents = "auto";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startupScreen.style.opacity = "1";
      });
    });
  });
}

// ============ EXIT WAITING MODE ============

if (startupScreen) {
  startupScreen.addEventListener("click", () => {
    if (!data.active) return;
    if (startupScreen.style.display !== "block") return;

    startupScreen.style.pointerEvents = "none";
    startupScreen.style.opacity = "0";

    setTimeout(() => {
      startupScreen.style.display = "none";
    }, 1000);
  });
}

// #021 — workday ledger (same local storage, no external dependencies)
if (!Array.isArray(data.workdays)) data.workdays = [];
if (!data.workday) data.workday = null;
function allWorkdays(){return data.workdays.concat(data.workday?[data.workday]:[]);}
function currentTask(){return data.workday && data.workday.tasks[data.workday.tasks.length-1];}
function switchTask(type,at,routeId){const w=data.workday;if(!w)return;const t=currentTask();if(t&&t.type===type)return;if(t)t.end=at;w.tasks.push({type,start:at,end:null,routeId:routeId||null});}
function paidMs(w,from=-Infinity,to=Infinity){return w.tasks.reduce((sum,t)=>sum+(t.type==='Break'?0:Math.max(0,Math.min(t.end==null?Date.now():t.end,to)-Math.max(t.start,from))),0);}
function commitWork(change){const before=JSON.stringify(data);try{change();save();}catch(e){data=JSON.parse(before);alert('Could not save. Your change was not committed.');return false;}render();return true;}
$('workBtn').onclick=()=>{if(!data.workday){if(data.active){alert('Finish your existing route first.');return;}commitWork(()=>{const now=Date.now();data.workday={id:String(now),start:now,end:null,tasks:[]};switchTask('Unassigned',now);});return;}if(data.active||currentTask().type==='Break')return;if(!confirm('End your workday?')||!confirm('Are you sure?'))return;if(commitWork(()=>{const now=Date.now();currentTask().end=now;data.workday.end=now;data.workdays.push(data.workday);data.workday=null;}))$('workDone').showModal();};
document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{if(!data.workday||data.active||currentTask().type==='Break'||currentTask().type===b.dataset.task)return;if(b.dataset.task==='Route 6184')$('startBtn').click();else commitWork(()=>switchTask(b.dataset.task,Date.now()));});
$('endBreak').onclick=()=>{if(currentTask()&&currentTask().type==='Break'&&Date.now()-currentTask().start>=1800000)commitWork(()=>switchTask('Unassigned',Date.now()));};
let taskOpen=false,routeOpen=true,ledgerSignature='';
const expandedLedger=new Set();
$('taskCollapse').onclick=()=>{taskOpen=!taskOpen;renderWork();};
$('routeCollapse').onclick=()=>{routeOpen=!routeOpen;renderWork();};
function renderWork(){const w=data.workday,t=currentTask(),onBreak=t&&t.type==='Break';$('workBtn').textContent=w?'END WORKDAY':'START WORKDAY';$('workBtn').className=w?'end':'start';$('workBtn').disabled=!!data.active||!!onBreak;$('workStatus').hidden=!w;$('workStatus').textContent=w?`Started ${timeText(w.start)} • ${t.type} • Paid ${duration(paidMs(w))}`:'';document.querySelectorAll('[data-task]').forEach(b=>{b.disabled=!w||!!data.active||!!onBreak;b.classList.toggle('nr-selected',!!t&&b.dataset.task===t.type);});$('endBtn').hidden=!data.active;$('breakPanel').hidden=!onBreak;if(onBreak){const remaining=Math.max(0,1800000-(Date.now()-t.start));$('breakTimer').textContent=timer(remaining);$('endBreak').disabled=remaining>0;}$('taskHistory').hidden=!taskOpen;$('taskCollapse').textContent=taskOpen?'⌃':'⌄';$('taskCollapse').setAttribute('aria-expanded',String(taskOpen));$('routeHistory').hidden=!routeOpen;$('viewAllBtn').hidden=!routeOpen;$('routeCollapse').textContent=routeOpen?'⌃':'⌄';$('routeCollapse').setAttribute('aria-expanded',String(routeOpen));if(taskOpen)renderLedger();}
function nrNode(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function compactDay(ts){const d=new Date(ts);return ['S2','M','T','W','T2','F','S'][d.getDay()]+'.'+'JFMAMJJASOND'[d.getMonth()]+d.getDate()+'.'+String(d.getFullYear()).slice(-2);}
function ledgerGroup(parent,key,label){const d=nrNode('details',null,'nr-ledger-group');d.open=expandedLedger.has(key);d.appendChild(nrNode('summary',label));d.ontoggle=()=>{if(d.open)expandedLedger.add(key);else expandedLedger.delete(key);};parent.appendChild(d);return d;}
function ledgerLine(parent,name,value,route){const e=nrNode(route?'button':'div',null,'nr-ledger-line');e.append(nrNode('strong',name),nrNode('small',value));if(route){e.type='button';e.onclick=()=>showReport(route);}parent.appendChild(e);}
function renderLedger(){const signature=JSON.stringify([data.workdays,data.routes,data.settings.weekStart]);if(signature===ledgerSignature)return;ledgerSignature=signature;const root=$('taskHistory');root.replaceChildren();const months={},weeks={};const sorted=data.workdays.slice().sort((a,b)=>b.start-a.start);if(!sorted.length)root.appendChild(nrNode('p','No completed workdays yet.','empty'));sorted.forEach(w=>{const bounds=weekBounds(w.start),start=new Date(bounds[0]),month=start.getFullYear()+'-'+start.getMonth(),week=String(bounds[0]);if(!months[month])months[month]=ledgerGroup(root,'m'+month,start.toLocaleDateString('en-CA',{month:'long',year:'numeric'}));if(!weeks[week])weeks[week]=ledgerGroup(months[month],'w'+week,start.toLocaleDateString('en-CA',{month:'short',day:'numeric'})+' – '+new Date(bounds[1]-1).toLocaleDateString('en-CA',{month:'short',day:'numeric'}));const day=ledgerGroup(weeks[week],'d'+w.id,compactDay(w.start)+'    Total Paid Hours: '+duration(paidMs(w)));ledgerLine(day,'1. Start Workday',timeText(w.start));w.tasks.forEach((t,i)=>{const n=i+2,r=data.routes.find(r=>r.id===t.routeId);if(r){ledgerLine(day,n+'a. Route '+r.routeNumber,timeText(r.start)+' | '+r.startKm.toLocaleString()+' KM',r);ledgerLine(day,n+'b. Route '+r.routeNumber,timeText(r.end)+' | '+r.endKm.toLocaleString()+' KM',r);}else ledgerLine(day,n+'. '+t.type,timeText(t.start)+' | '+timeText(t.end));});ledgerLine(day,(w.tasks.length+2)+'. End Workday',timeText(w.end));});}
$('editWorkBtn').onclick=()=>{if(data.workday||data.active){alert('Finish the active workday first.');return;}const w=data.workdays.slice().sort((a,b)=>b.end-a.end)[0];if(!w){alert('No completed workdays.');return;}const root=$('workEditFields');root.replaceChildren();w.tasks.forEach((t,i)=>{const row=nrNode('div',null,'nr-edit-row');const select=nrNode('select');['Unassigned','Package Handler','Training','Vehicle Movement','Break','Janitorial','Route 6184'].filter(x=>t.routeId?x==='Route 6184':x!=='Route 6184').forEach(x=>{const o=nrNode('option',x);o.value=x;select.appendChild(o);});select.value=t.type;select.disabled=!!t.routeId;const start=nrNode('input'),end=nrNode('input');[start,end].forEach(e=>{e.type='datetime-local';e.required=true;e.disabled=!!t.routeId;});start.value=toLocalDateTimeInput(t.start);end.value=toLocalDateTimeInput(t.end);row.append(select,nrNode('label','Start'),start,nrNode('label','End'),end);root.appendChild(row);});$('workEditDialog').showModal();};
$('workEditForm').onsubmit=e=>{e.preventDefault();if(data.workday||data.active)return;const w=data.workdays.slice().sort((a,b)=>b.end-a.end)[0];if(!w)return;const tasks=Array.from($('workEditFields').children).map((row,i)=>{const t=w.tasks[i],inputs=row.querySelectorAll('input');const parse=(v,old)=>v===toLocalDateTimeInput(old)?old:new Date(v).getTime();return Object.assign({},t,{type:row.querySelector('select').value,start:parse(inputs[0].value,t.start),end:parse(inputs[1].value,t.end)});});if(tasks.some((t,i)=>!Number.isFinite(t.start)||!Number.isFinite(t.end)||t.end<t.start||(i&&t.start!==tasks[i-1].end)||(t.type==='Break'&&t.end-t.start<1800000))){alert('Tasks must be consecutive, ordered and non-overlapping. Breaks must be at least 30 minutes.');return;}if(!confirm('Save corrected workday?'))return;if(commitWork(()=>{w.tasks=tasks;w.start=tasks[0].start;w.end=tasks[tasks.length-1].end;}))$('workEditDialog').close();};
function downloadNR(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=nrNode('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function backupText(){return JSON.stringify(data,null,2);}
$('backupBtn').onclick=()=>$('backupDialog').showModal();
$('downloadBackup').onclick=()=>downloadNR(backupText(),'NightReapers-backup.json','application/json');
function workReport(){return data.workdays.map(w=>dateText(w.start)+' | Paid '+duration(paidMs(w))+'\n'+w.tasks.map(t=>{const r=data.routes.find(r=>r.id===t.routeId);return t.type+' '+timeText(t.start)+' – '+timeText(t.end)+(r?' | '+r.startKm+' – '+r.endKm+' KM':'');}).join('\n')).join('\n\n')+'\n\nROUTES\n'+data.routes.map(r=>dateText(r.start)+' Route '+r.routeNumber+' '+timeText(r.start)+' – '+timeText(r.end)+' | '+r.startKm+' – '+r.endKm+' KM').join('\n');}
async function emailNR(report){const content=report?workReport():backupText(),name=report?'NightReapers-work-report.txt':'NightReapers-backup.json',type=report?'text/plain':'application/json';if(!report&&!confirm('Full backup contains private pay information. Continue?'))return;const file=new File([content],name,{type});if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return;}catch(e){if(e.name==='AbortError')return;}}downloadNR(content,name,type);alert('File downloaded. Attach it manually in your email app.');location.href='mailto:'+encodeURIComponent($('backupEmail').value.trim())+'?subject='+encodeURIComponent(name);}
$('emailBackup').onclick=()=>emailNR(false);$('emailReport').onclick=()=>emailNR(true);
$('importBackup').onchange=()=>{const input=$('importBackup'),file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x||!Array.isArray(x.routes)||!x.settings||!Number.isFinite(Number(x.settings.rate))||!Number.isInteger(Number(x.settings.weekStart))||Number(x.settings.weekStart)<0||Number(x.settings.weekStart)>6||x.routes.some(r=>!r||!r.id||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.end<r.start||!Number.isFinite(r.startKm)||!Number.isFinite(r.endKm)||r.endKm<r.startKm))throw Error('Invalid route or settings data');if(x.workdays!=null&&!Array.isArray(x.workdays))throw Error('Invalid workdays');const validWork=w=>w&&Number.isFinite(w.start)&&Array.isArray(w.tasks)&&w.tasks.length&&w.tasks.every((t,i)=>t&&Number.isFinite(t.start)&&(t.end==null?i===w.tasks.length-1&&w.end==null:Number.isFinite(t.end)&&t.end>=t.start)&&(!i||t.start===w.tasks[i-1].end));if((x.workdays||[]).some(w=>!validWork(w)||!Number.isFinite(w.end))||(x.workday&&!validWork(x.workday)))throw Error('Invalid workday timeline');if(data.workday||data.active)throw Error('Finish active work before restoring');if(!confirm('Replace current records with this backup? A safety copy will be saved first.'))return;localStorage.setItem(STORAGE_KEY+'_preimport',backupText());downloadNR(backupText(),'NightReapers-before-import.json','application/json');localStorage.setItem(STORAGE_KEY,JSON.stringify(x));location.reload();}catch(e){alert('Import failed: '+e.message);}finally{input.value='';}};reader.readAsText(file);};
setInterval(render,1000);render();
