// src/pages/ReportsPage.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useConfig } from "./ConfigProvider";

// --- Report options ---
const REPORT_TYPES = [
  'Sales Report',
  'Payment Reports',
  'Customers Report',
];
const userName = "junaid";

const token = localStorage.getItem("jwt_token");

// --- Utilities ---
function addMonths(date, n) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + n;
  d.setMonth(targetMonth);
  // Handle month overflow edge cases (e.g., adding to Jan 31)
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

function CopyPathButton({ path }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy file path"
      style={{ marginLeft: "8px", cursor: "pointer" }}
    >
      📋
      {copied && <span style={{ marginLeft: "4px" }}>Copied!</span>}
    </button>
  );
}

function isRangeWithin12Months(fromISO, toISO) {
  if (!fromISO || !toISO) return true;
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISO + 'T23:59:59');
  if (to < from) return false;
  const limit = addMonths(from, 12);
  return to <= limit;
}

function formatRange(fromISO, toISO) {
  if (!fromISO || !toISO) return '';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  const f = new Date(fromISO);
  const t = new Date(toISO);
  return `${f.toLocaleDateString('en-GB', opts)} — ${t.toLocaleDateString('en-GB', opts)}`;
}

function timeAgo(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(mo / 12);
  return `${y}y ago`;
}



function mockGenerateReport(payload) {
  const ts = Date.now();
  const key = payload.reportType.toLowerCase().replace(/\s+/g, '_');
  const fileExt = payload.reportType.includes('Product') ? 'csv' : payload.reportType.includes('Payment') ? 'xlsx' : 'pdf';
  const report = {
    id: `rpt_${ts}`,
    name: payload.reportType,
    fromDate: payload.fromDate,
    toDate: payload.toDate,
    createdAt: new Date(ts).toISOString(),
    fileName: `${key}_${ts}.${fileExt}`,
    status: 'READY',
  };
  return new Promise((resolve) =>
    setTimeout(() => resolve({ success: true, report }), 600)
  );
}

// --- Component ---
const ReportsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);

    const config = useConfig();
        var apiUrl="";
          if(config){
          console.log(config.API_URL);
          apiUrl=config.API_URL;
          }

  // For portal menu positioning
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 220 });
  const typeBtnRef = useRef(null);
  const menuRef = useRef(null);

  const [recentReports, setRecentReports] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load recent reports (mocked)
  useEffect(() => {
    let mounted = true;
    setLoadingRecent(true);
    mockFetchRecentReports({ limit: 10 })
      .then((res) => {
        if (mounted && res.success) setRecentReports(res.reports);
      })
      .catch(() => {
        alert('Failed to fetch recent reports (mock).');
      })
      .finally(() => {
        if (mounted) setLoadingRecent(false);
      });
    return () => (mounted = false);
  }, []);

  // Validation
  const validationError = useMemo(() => {
    if (!fromDate || !toDate) return '';
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return 'To date cannot be before From date.';
    if (!isRangeWithin12Months(fromDate, toDate)) return 'Date range cannot exceed 12 months.';
    return '';
  }, [fromDate, toDate]);

  const canGenerate = fromDate && toDate && reportType && !validationError && !isGenerating;

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!canGenerate) return;

    setIsGenerating(true);

    try {
        const payload = { reportType, fromDate, toDate };
        console.log("Generate Report - Payload:", payload);
        // alert(token);
        // POST to backend and expect an Excel binary
        const response = await fetch(apiUrl+"/api/shop/report", {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Failed to generate report");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Format datetime: YYYYMMDD_HHmmss
        const now = new Date();
        const dateTimeStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);

        // Ensure no leading dot in extension
        const extension = "xlsx";
        const cleanExt = extension.replace(/^\.+/, "");

        const clean = str => str.replace(/\.+$/, ""); // remove trailing dots
        const pureFileName = `${clean(reportType)}_${clean(dateTimeStr)}.${clean(extension)}`;

        const osLinks = {
            windows: `file:///C:/Users/${userName}/Downloads/${pureFileName}`,
            macos: `file:///Users/${userName}/Downloads/${pureFileName}`,
            ubuntu: `file:///home/${userName}/Downloads/${pureFileName}`
        };

        // Create downloadable link element
        const a = document.createElement("a");
        a.href = url;
        a.download = pureFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Store clickable link in fileName property
        // const fileUrl = osLinks.windows; // or macos / ubuntu

        setRecentReports(prev => [
            {
                id: Date.now(),
                name: reportType,
                fromDate,
                toDate,
                createdAt: now.toISOString(),
                fileName: pureFileName,
            },
            ...prev
        ].slice(0, 10));

        // Call save API with details
        const saveReportPayload = {
            reportType,
            fromDate,
            toDate,
            generatedAt: now.toISOString(),
            fileName: pureFileName
        };

        await fetch(apiUrl+"/api/shop/report/saveDetails", {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saveReportPayload)
        });

        window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while generating the report.");
    } finally {
      setIsGenerating(false);
    }
  };

  // open menu & position it (anchor below button)
  const openTypeMenu = () => {
    if (!typeBtnRef.current) return;
    const rect = typeBtnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: Math.max(220, rect.width),
    });
    setShowTypeMenu(true);
  };

    // --- Mock API area (attempt real fetch, fallback to seed) ---
    async function mockFetchRecentReports({ limit = 10 } = {}) {

        try {
            const response = await fetch(apiUrl+'/api/shop/report/recent?limit=10', {
                method: "GET",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Fetched recent reports:", data);
            // If backend returns an array:
            if (Array.isArray(data)) {
                return { success: true, reports: data.slice(0, limit) };
            }
            // If backend returns { success: true, reports: [...] }
            if (data && data.reports) {
                return { success: true, reports: data.reports.slice(0, limit) };
            }

            // Fallback to empty
            return { success: false, reports: [] };
        } catch (error) {
            console.error("Failed to fetch recent reports:", error);
            // Fallback seed data
            const seed = [
                {
                    id: 'rpt_001',
                    name: 'Sales Report',
                    fromDate: '2025-01-01',
                    toDate: '2025-03-31',
                    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
                    fileName: 'sales_2025Q1.pdf',
                    status: 'READY',
                },
                {
                    id: 'rpt_002',
                    name: 'Product Report',
                    fromDate: '2025-06-01',
                    toDate: '2025-06-30',
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
                    fileName: 'product_jun_2025.csv',
                    status: 'READY',
                },
                {
                    id: 'rpt_003',
                    name: 'Payment Reports',
                    fromDate: '2025-07-01',
                    toDate: '2025-07-31',
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2d ago
                    fileName: 'payments_jul_2025.xlsx',
                    status: 'READY',
                },
            ];
            return { success: true, reports: seed.slice(0, limit) };
        }
    }

  // close menu when clicking outside, on scroll/resize
  useEffect(() => {
    if (!showTypeMenu) return;

    const handleOutside = (e) => {
      const btn = typeBtnRef.current;
      const menu = menuRef.current;
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setShowTypeMenu(false);
      }
    };

    const closeOnScrollOrResize = () => setShowTypeMenu(false);

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', closeOnScrollOrResize, true);
    window.addEventListener('resize', closeOnScrollOrResize);

    const handleEsc = (e) => { if (e.key === 'Escape') setShowTypeMenu(false); };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', closeOnScrollOrResize, true);
      window.removeEventListener('resize', closeOnScrollOrResize);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showTypeMenu]);

  const selectType = (type) => {
    setReportType(type);
    setShowTypeMenu(false);
  };

  return (
      <div className="page-container">
          <h2>Reports</h2>

          {/* Top section: filters and actions */}
          <div className="glass-card" style={{ padding: '1rem', overflow: 'visible' }}>
              <form onSubmit={onGenerate}>
                  <div
                      className="generate-report-grid"
                      style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: '1.5rem',
                      }}
                  >
                      {/* Dates in a single row */}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: '1 1 200px' }}>
                              <label>From date</label>
                              <input
                                  type="date"
                                  value={fromDate}
                                  onChange={(e) => setFromDate(e.target.value)}
                                  required
                                  style={{ width: '100%' }}
                              />
                          </div>

                          <div className="form-group" style={{ flex: '1 1 200px' }}>
                              <label>To date</label>
                              <input
                                  type="date"
                                  value={toDate}
                                  onChange={(e) => setToDate(e.target.value)}
                                  required
                                  style={{ width: '100%' }}
                              />
                          </div>
                      </div>

                      {/* Report type + Generate row */}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div className="form-group" style={{ position: 'relative', flex: '1 1 200px' }}>
                              <label>Report type</label>
                              <button
                                  type="button"
                                  className="btn"
                                  ref={typeBtnRef}
                                  onClick={openTypeMenu}
                                  aria-haspopup="listbox"
                                  aria-expanded={showTypeMenu}
                                  style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '0.5rem',
                                      minWidth: '120px',
                                      backgroundColor: '#fff', // White background
                                      color: '#000', // Optional: black text
                                  }}
                              >
                                  {reportType || 'Select report type'}
                              </button>

                              {showTypeMenu &&
                                  ReactDOM.createPortal(
                                      <ul
                                          ref={menuRef}
                                          role="listbox"
                                          className="glass-card"
                                          style={{
                                              position: 'absolute',
                                              top: menuPos.top,
                                              left: menuPos.left,
                                              zIndex: 10000,
                                              background: '#fff',
                                              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                              borderRadius: 8,
                                              margin: 0,
                                              listStyle: 'none',
                                              padding: '6px 0',
                                              minWidth: menuPos.width || 220,
                                              maxHeight: 280,
                                              overflowY: 'auto',
                                          }}
                                      >
                                          {REPORT_TYPES.map((t) => (
                                              <li key={t}>
                                                  <button
                                                      type="button"
                                                      className="btn"
                                                      style={{
                                                          width: '100%',
                                                          textAlign: 'left',
                                                          borderRadius: 0,
                                                          background: reportType === t ? '#f3f4f6' : 'transparent',
                                                          padding: '0.5rem 0.75rem',
                                                          cursor: 'pointer',
                                                          border: 'none',
                                                          color: '#312f62',
                                                      }}
                                                      onClick={() => selectType(t)}
                                                      role="option"
                                                      aria-selected={reportType === t}
                                                  >
                                                      {t}
                                                  </button>
                                              </li>
                                          ))}
                                      </ul>,
                                      document.body
                                  )}
                          </div>

                          <div className="form-actions" style={{ flex: '1 1 150px' }}>
                              <button
                                  type="submit"
                                  className="btn"
                                  disabled={!canGenerate}
                                  style={{ width: '100%' }}
                              >
                                  {isGenerating ? 'Generating…' : 'Generate report'}
                              </button>
                          </div>
                      </div>
                  </div>

                  {validationError && (
                      <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>{validationError}</p>
                  )}
              </form>
          </div>


          {/* Bottom section: recent reports */}
          <div className="glass-card" style={{ marginTop: '1.5rem' }}>
              <div className="page-header" style={{ padding: '1rem 1rem 0 1rem' }}>
                  <h3 style={{ margin: 0 }}>Recent generated reports</h3>
              </div>

              <div style={{ padding: '1rem' }}>
                  {loadingRecent ? (
                      <p>Loading recent reports…</p>
                  ) : recentReports.length === 0 ? (
                      <p>No reports yet.</p>
                  ) : (
                      <table className="data-table">
                          <thead>
                          <tr>
                              <th>#</th>
                              <th>Report name</th>
                              <th>Duration</th>
                              <th>Generated</th>
                              {/* Filename removed */}
                          </tr>
                          </thead>
                          <tbody>
                          {recentReports.map((r, idx) => (
                              <tr key={r.id}>
                                  <td>{idx + 1}</td>
                                  <td>{r.name}</td>
                                  <td>{formatRange(r.fromDate, r.toDate)}</td>
                                  <td>{timeAgo(r.createdAt)}</td>
                              </tr>
                          ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      </div>

  );
};

export default ReportsPage;
