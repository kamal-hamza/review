import "./globals.css";

function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                <div>{children}</div>
            </body>
        </html>
    );
}

export default RootLayout;
