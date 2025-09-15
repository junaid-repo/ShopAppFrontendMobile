// src/pages/PaymentsPage.js
import React, { useState, useEffect, useMemo } from "react";
import { useConfig } from "./ConfigProvider";

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  // initialize searchTerm and paymentMode from localStorage if present
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      const s = localStorage.getItem("payments_filters");
      if (s) return JSON.parse(s).searchTerm || "";
    } catch (e) {}
    return "";
  });
  const [paymentMode, setPaymentMode] = useState(() => {
    try {
      const s = localStorage.getItem("payments_filters");
      if (s) return JSON.parse(s).paymentMode || "All";
    } catch (e) {}
    return "All";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // show 5 records per page

  const config = useConfig();
  var apiUrl = "";
  if (config) {
    console.log(config.API_URL);
    apiUrl = config.API_URL;
  }
    const _savedFilters = (() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (!s) return null;
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    })();
    const formatDateInput = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [fromDate, setFromDate] = useState(() => {
        return (_savedFilters && _savedFilters.fromDate) || formatDateInput(defaultFrom);
    });
    const [toDate, setToDate] = useState(() => {
        return (_savedFilters && _savedFilters.toDate) || formatDateInput(defaultTo);
    });

    // 🔹 whenever dates change, enforce max 30 days
    useEffect(() => {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (to < from) {
            // auto-correct if user picks invalid range
            setToDate(fromDate);
            return;
        }

        const diffDays = Math.floor((to - from) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
            alert("Date range cannot exceed 7 days. Adjusting the end date.");
            const newTo = new Date(from);
            newTo.setDate(newTo.getDate() + 7);
            setToDate(formatDateInput(newTo));
        }
    }, [fromDate, toDate]);

    // save filters whenever they change so they persist across page switches
    useEffect(() => {
        try {
            const obj = { fromDate, toDate, paymentMode, searchTerm };
            localStorage.setItem("payments_filters", JSON.stringify(obj));
        } catch (e) {
            // ignore storage errors
        }
    }, [fromDate, toDate, paymentMode, searchTerm]);

    // compute unique payment modes from all payments (used to populate dropdown)
    const uniqueModes = useMemo(() => {
        const set = new Set();
        payments.forEach((p) => {
            if (p.method) set.add(p.method);
        });
        return Array.from(set);
    }, [payments]);



    useEffect(() => {

        const query = `?fromDate=${fromDate}&toDate=${toDate}`;
        //alert(query);

        fetch(`${apiUrl}/api/shop/get/paymentLists${query}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log("API response:", data);
                setPayments(data);
            })
            .catch((error) => {
                console.error("Error fetching paymentLists:", error);
                alert("Something went wrong while fetching paymentLists.");
            });
    }, [apiUrl, fromDate, toDate]);
  // --- New: date range state (default to current month) ---



  // try to load saved filters from localStorage and use them as initial values



  // save filters whenever they change so they persist across page switches
  useEffect(() => {
    try {
      const obj = { fromDate, toDate, paymentMode, searchTerm };
      localStorage.setItem("payments_filters", JSON.stringify(obj));
    } catch (e) {
      // ignore storage errors
    }
  }, [fromDate, toDate, paymentMode, searchTerm]);

  // compute unique payment modes from all payments (used to populate dropdown)


  // helper to normalize a date string from payment and the input date values
  const toDateObjStart = (dateStrOrObj) => {
    const d = new Date(dateStrOrObj);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const toDateObjEnd = (dateStrOrObj) => {
    const d = new Date(dateStrOrObj);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // filter by search AND date range
  const filteredPayments = useMemo(() => {
    const from = toDateObjStart(fromDate);
    const to = toDateObjEnd(toDate);

    return payments.filter((p) => {
      // search filter
      const matchesSearch = p.saleId
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // mode filter
      const matchesMode = paymentMode === "All" || !paymentMode ? true : (p.method === paymentMode);

      // date parsing - guard against invalid dates
      const pDate = new Date(p.date);
      if (isNaN(pDate.getTime())) return matchesSearch; // if date invalid, don't filter by date

      const withinRange = pDate >= from && pDate <= to;

      return matchesSearch && withinRange && matchesMode;
    });
  }, [payments, searchTerm, fromDate, toDate, paymentMode]);

  // compute totals and mode counts for the selected range
  const { totalAmount, modeCounts } = useMemo(() => {
    const counts = {};
    let total = 0;
    filteredPayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      total += amt;
      const m = p.method || "Unknown";
      counts[m] = (counts[m] || 0) + 1;
    });
    return { totalAmount: total, modeCounts: counts };
  }, [filteredPayments]);

  // pagination calculations (apply on filteredPayments)
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  // reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, paymentMode]);

  return (
    <div className="page-container">
      <h2>Payments</h2>
      <div
        className="page-header"
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >


        {/* Removed inline stacked date inputs from here - moved into unified stats container below */}
      </div>

      {/* Stats container: single div holding dates (stacked), total box, and payment-mode bars (horizontal) */}
      <div className="payments-stats">
        {/* Dates card */}
        <div className="stats-card dates-card">
          <div className="card-title">Date Range</div>
          <div className="time-range-selector-vertical">
            <label>
              From
              <input className="date-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              To
              <input className="date-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            {/* Payment mode dropdown filter */}
            <label>
              Mode
              <select className="date-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="All">All</option>
                {uniqueModes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Total card */}
        <div className="stats-card total-card">
          <div className="card-title">Total Payments</div>
          <div className="total-amount"  style={{
              fontSize: "30.1px"
          }}>₹{totalAmount.toLocaleString()}</div>
          <div className="total-sub">Showing: {fromDate} — {toDate}</div>
        </div>

        {/* Bars card */}
        <div className="stats-card bars-card">
          <div className="card-title">Payment Modes</div>
          <div className="payments-bars">
            {Object.keys(modeCounts).length === 0 ? (
              <div className="no-data">No payments in selected range</div>
            ) : (
              (() => {
                const entries = Object.entries(modeCounts);
                const max = Math.max(...entries.map(([, c]) => c), 1);
                const colors = ["#4caf50", "#ffb300", "#2196f3", "#9c27b0", "#f44336", "#00bcd4"];
                return entries.map(([method, count], idx) => (
                  <div key={method} className="mode-row">
                    <div className="mode-label">{method}</div>
                    <div className="mode-bar-wrapper">
                      <div className="mode-bar-inner" style={{ width: `${Math.max((count / max) * 100, 6)}%`, background: colors[idx % colors.length] }} />
                    </div>
                    <div className="mode-count">{count}</div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      </div>

        <input
            type="text"
            placeholder="Search by Invoice ID..."
            className="search-bar"
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // reset to page 1 after search
            }}
            style={{
                width: '90%',
                marginTop: '25px',
                marginBottom: '-25px',
            }}
        />
      <div className="glass-card">
          <table className="data-table" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
              <tr>
                  <th style={{ padding: "8px 4px" }}>Payment ID</th>
                  <th style={{ padding: "8px 4px" }}>Invoice ID</th>
                  <th style={{ padding: "8px 4px" }}>Date</th>
                  <th style={{ padding: "8px 4px" }}>Amount</th>
                  <th style={{ padding: "8px 4px" }}>Method</th>
              </tr>
              </thead>
              <tbody>
              {currentPayments.length > 0 ? (
                  currentPayments.map((payment) => (
                      <tr key={payment.id}>
                          <td style={{ padding: "8px 4px" }}>{payment.id}</td>
                          <td style={{ padding: "8px 4px" }}>{payment.saleId}</td>
                          <td style={{ whiteSpace: "nowrap", padding: "8px 4px" }}>
                              {(() => {
                                  const d = new Date(payment.date);
                                  const day = String(d.getDate()).padStart(2, "0");
                                  const month = String(d.getMonth() + 1).padStart(2, "0");
                                  const year = d.getFullYear();
                                  return `${day}-${month}-${year}`;
                              })()}
                          </td>
                          <td style={{ padding: "8px 4px" }}>₹{payment.amount.toLocaleString()}</td>
                          <td style={{ padding: "8px 4px" }}>{payment.method}</td>
                      </tr>
                  ))
              ) : (
                  <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "8px 4px" }}>
                          No records found
                      </td>
                  </tr>
              )}
              </tbody>
          </table>

      </div>

      {/* Pagination Controls */}
      <div className="pagination button">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index + 1)}
            className={currentPage === index + 1 ? "active" : ""}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaymentsPage;
