import { createFileRoute } from "@tanstack/react-router";
import { authorized, CORS, reply, toolList } from "@/lib/agent.server";

export const Route = createFileRoute("/api/agent/tools")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        if (!authorized(request)) return reply({ success: false, error: "Unauthorized" }, 401);
        const list = toolList();
        return reply({ success: true, data: list.data, tools: list.tools });
      },
    },
  },
});
