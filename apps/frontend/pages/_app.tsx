import { AppProps } from "next/app";
import Head from "next/head";
import { AuthProvider } from "../contexts/AuthContext";

/**
 * Custom App component with auth provider
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #0a0e27;
          min-height: 100vh;
          color: #e2e8f0;
        }

        button {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
