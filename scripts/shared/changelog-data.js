(() => {
    window.SHOPRUNNER_CHANGELOG = [
        {
            date: "2026-02-25",
            title: "Orders and Invoice UX Updates",
            summary: "The dashboard workflow is now faster to scan and invoices are cleaner.",
            items: [
                "Added date range filtering (Past 30 days / This month).",
                "Added list/grid view toggle for orders.",
                "Updated invoice shipping display to show Shipping (Air/Sea) in one line.",
                "Fixed invoice company contact mapping so email and address render correctly."
            ],
            commits: ["f0e7b96", "3b07c66", "8663d0f"]
        },
        {
            date: "2026-02-25",
            title: "Shipping and Session Improvements",
            summary: "Shipping behavior and sign-in persistence are now more predictable.",
            items: [
                "Implemented Remember this device with local/session storage modes.",
                "Added shipping type and sea-dimension handling in order flow.",
                "Disabled weight input when sea shipping is selected.",
                "Improved pagination and search handling in the orders table."
            ],
            commits: ["419e96b", "d11cd8c", "e207b38", "dd500ac"]
        },
        {
            date: "2026-02-24",
            title: "Invoice Reliability and Payment Handling",
            summary: "Invoice generation now behaves more reliably across browsers and payment states.",
            items: [
                "Settling an order as paid now updates amounts consistently.",
                "Print flow waits for assets before opening print.",
                "Inline invoice print fallback improved popup-blocked scenarios.",
                "Invoice company and handling labels were refined for readability."
            ],
            commits: ["a754ccf", "4d3a41a", "cfb36b6", "6e3dea0"]
        },
        {
            date: "2026-02-23",
            title: "Cloud Data Foundation",
            summary: "Core cloud-backed ordering and invoice identity support were introduced.",
            items: [
                "Added Supabase cloud data layer for team members and orders.",
                "Enabled invoice generation flow with persistent invoice identity.",
                "Added support for order special notes."
            ],
            commits: ["deed242", "f0201d1", "9697079"]
        }
    ];
})();
