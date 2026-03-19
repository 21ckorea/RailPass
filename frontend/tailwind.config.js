/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#2563eb",
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "#f1f5f9",
                    foreground: "#0f172a",
                },
            },
        },
    },
    plugins: [],
};
