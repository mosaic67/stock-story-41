import { createFileRoute } from "@tanstack/react-router";
import { authorized, CORS, execute, reply } from "@/lib/agent.server";

export const Route = createFileRoute("/api/agent/exec")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        if (!authorized(request)) return reply({ success: false, error: "Unauthorized" }, 401);
        try {
          return await execute(request);
        } catch (e) {
          return reply({ success: false, error: e instanceof Error ? e.message : "Internal error" }, 500);
        }
      },
    },
  },
});
