import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  if (process.env.OPENAPI_DOCS_ENABLED === "false") {
    notFound();
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fff" }}>
      <div id="swagger-ui" />
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener("load", function () {
              window.ui = SwaggerUIBundle({
                url: "/api/openapi.json",
                dom_id: "#swagger-ui",
                deepLinking: true,
                presets: [SwaggerUIBundle.presets.apis],
                layout: "BaseLayout"
              });
            });
          `
        }}
      />
    </main>
  );
}
