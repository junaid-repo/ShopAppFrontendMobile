// src/pages/ReportsPage.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';

// Import the stylesheet
import './ReportsPage.css';

// --- Report options with Icons ---
const REPORT_OPTIONS = {
    'Sales Report': { icon: "fa-duotone fa-solid fa-chart-mixed" },
    'Products Report': { icon: "fa-duotone fa-solid fa-box" },
    'Payment Reports': { icon: "fa-duotone fa-solid fa-credit-card" },
    'Customers Report': { icon: "fa-duotone fa-solid fa-users" },
    'Product Sales Report': { icon: "fa-duotone fa-solid fa-dolly" }
};
const REPORT_TYPES = Object.keys(REPORT_OPTIONS);
const userName = "junaid";


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
            className="copy-path-button"
        >
            📋
            {copied && <span className="copy-path-copied">Copied!</span>}
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



// --- Mock API area (attempt real fetch, fallback to seed) ---


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

    const { showAlert } = useAlert();
    // Set default dates: fromDate = today - 30 days, toDate = today
    function getTodayISO() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    }
    function getPastISO(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    }

    const [fromDate, setFromDate] = useState(getPastISO(30));
    const [toDate, setToDate] = useState(getTodayISO());
    const [reportType, setReportType] = useState(REPORT_TYPES[0]); // Default to first report
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
                showAlert('Failed to fetch recent reports (mock).');
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
            // showAlert(token);
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
            showAlert("Something went wrong while generating the report.");
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

    async function mockFetchRecentReports({ limit = 10 } = {}) {

        try {



            const response = await fetch(apiUrl+"/api/shop/report/recent?limit=10", {
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

    // Helper to get icon class for a report name
    const getReportIcon = (reportName) => {
        return REPORT_OPTIONS[reportName]?.icon || 'fa-duotone fa-solid fa-file-lines'; // Fallback icon
    };

    return (
        <div className="page-container">
            <h2>Reports</h2>

            {/* Top section: filters and actions */}
            <div className="glass-card report-form-container">
                <form onSubmit={onGenerate}>
                    <div className="generate-report-grid">

                        {/* Row 1: Date selectors (Request 2) */}
                        <div className="date-inputs-container">
                            <div className="form-group">
                                <label>From date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    style={{color: 'var(--text-color)', border: 'var(--text-color)'}}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>To date</label>
                                <input
                                    type="date"
                                    style={{color: 'var(--text-color)'}}
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Row 2: Report type dropdown + Generate (Request 3) */}
                        <div className="report-actions-container">

                            {/* Label beside dropdown */}
                            <label className="report-type-label">Report type</label>

                            <div className="report-type-dropdown-wrapper">
                                <button
                                    type="button"
                                    className="date-input report-type-button"
                                    ref={typeBtnRef}
                                    onClick={openTypeMenu}
                                    aria-haspopup="listbox"
                                    aria-expanded={showTypeMenu}
                                >
                                    {reportType ? (
                                        <span className="report-icon-label">
                                            <i className={getReportIcon(reportType)}></i>
                                            {reportType}
                                        </span>
                                    ) : (
                                        'Select report type'
                                    )}
                                </button>

                                {showTypeMenu && ReactDOM.createPortal(
                                    <ul
                                        ref={menuRef}
                                        role="listbox"
                                        className="glass-card report-portal-menu"
                                        style={{
                                            top: menuPos.top,
                                            left: menuPos.left,
                                            minWidth: menuPos.width
                                        }}
                                    >
                                        {REPORT_TYPES.map((t) => (
                                            <li key={t}>
                                                <button
                                                    type="button"
                                                    className="report-option-item"
                                                    onClick={() => selectType(t)}
                                                    role="option"
                                                    aria-selected={reportType === t}
                                                >
                                                    <span className="report-icon-label">
                                                        <i className={getReportIcon(t)}></i>
                                                        {t}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>,
                                    document.body
                                )}
                            </div>

                            {/* Button next to dropdown */}
                            <button type="submit" className="btn" disabled={!canGenerate}>
                                {isGenerating ? 'Generating…' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    {validationError && (
                        <p className="validation-error">{validationError}</p>
                    )}
                </form>
            </div>

            {/* Bottom section: recent reports (Request 4) */}
            <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <div className="page-header recent-reports-header">
                    <h3 style={{ margin: 0 }}>Recent generated reports</h3>
                </div>

                <div className="recent-reports-content">
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
                                <th>File name</th>
                            </tr>
                            </thead>
                            <tbody>
                            {/* Make sure to add the data-label attributes here! */}
                            {recentReports.map((r, idx) => (
                                <tr key={r.id}>
                                    <td data-label="#">{idx + 1}</td>
                                    <td data-label="Report Name">
                                        <span className="report-icon-label">
                                            <i className={getReportIcon(r.name)}></i>
                                            {r.name}
                                        </span>
                                    </td>
                                    <td data-label="Duration">{formatRange(r.fromDate, r.toDate)}</td>
                                    <td data-label="Generated">{timeAgo(r.createdAt)}</td>
                                    <td data-label="File Name">
                                        <a
                                            href={`file:///home/${userName}/Downloads/${r.fileName}`} // or your real URL
                                            download={r.fileName}
                                        >
                                            {r.fileName}
                                        </a>
                                    </td>
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