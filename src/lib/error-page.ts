export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Something went wrong</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        background: #fafafa;
        color: #111827;
      }

      .container {
        width: 100%;
        max-width: 42rem;
        text-align: center;
      }

      .eyebrow {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
      }

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .answers {
        margin-top: 32px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        text-align: left;
      }

      .answer {
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fff;
      }

      .answer.correct {
        background: #f3f4f6;
        font-weight: 600;
      }

      .footer {
        margin-top: 24px;
        font-size: 14px;
        color: #6b7280;
      }

      .footer strong {
        color: #111827;
      }

      .actions {
        margin-top: 32px;
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      button,
      a {
        appearance: none;
        border: 1px solid #e5e7eb;
        background: #fff;
        color: inherit;
        padding: 10px 16px;
        border-radius: 10px;
        font: inherit;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: background 0.15s ease;
      }

      button:hover,
      a:hover {
        background: #f3f4f6;
      }

      @media (prefers-color-scheme: dark) {
        body {
          background: #09090b;
          color: #fafafa;
        }

        .eyebrow,
        .footer {
          color: #a1a1aa;
        }

        .footer strong {
          color: #fafafa;
        }

        .answer {
          background: #09090b;
          border-color: #27272a;
        }

        .answer.correct {
          background: #18181b;
        }

        button,
        a {
          background: transparent;
          border-color: #27272a;
          color: #fafafa;
        }

        button:hover,
        a:hover {
          background: #18181b;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <p class="eyebrow">Something went wrong.. DW!</p>

      <h1>Choose the correct answer</h1>

      <div class="answers">
        <div class="answer">
          A. Your internet connection is offline.
        </div>

        <div class="answer">
          B. The question is still loading.
        </div>

        <div class="answer">
          C. Something unexpected happened (from our side).
        </div>

        <div class="answer correct">
          D. Retry and let's pretend nothing has happened 👀
        </div>
      </div>

      <p class="footer">
        Correct answer: <strong>D</strong>
      </p>

      <div class="actions">
        <button onclick="location.reload()">
          Retry
        </button>

        <a href="/">
          Go Home
        </a>
      </div>
    </div>
    <script>
  const key = "error-page-retry";

  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else {
    sessionStorage.removeItem(key);
  }
</script>
  </body>
</html>`;
}
