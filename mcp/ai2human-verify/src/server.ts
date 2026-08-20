import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getVerification, listPolicies, runClaim } from "./engine.js";
import { policies } from "./policies.js";
import type { EvidenceDimension, VerifyConfig } from "./types.js";

const server = new McpServer({
  name: "ai2human-verify",
  version: "0.2.0"
});

server.registerTool(
  "verify_claim",
  {
    title: "Verify a claim against evidence",
    description:
      "Runs the verification chain for a claim type (policy) against an evidence bundle. Returns verdict (pass/fail/resubmit/manual_review), per-check results, missing evidence, and — when finalized — a verifiable receipt. claimType selects the policy; see list_policies.",
    inputSchema: {
      claimType: z.string().describe("Policy id, e.g. delivery_confirmed, x_post_claim, wallet_claim"),
      evidence: z.record(z.unknown()).default({}).describe("Evidence bundle with six dimensions: identity, time, location, content, process, corroboration"),
      config: z.record(z.unknown()).optional().describe("Per-call config: expectedAuthorHandle, requiredHashtags, tokenAddress, minTokenBalance, maxAgeHours, etc.")
    }
  },
  async (args) => {
    try {
      const record = await runClaim({
        claimType: args.claimType,
        evidence: args.evidence as EvidenceDimension,
        config: args.config as VerifyConfig | undefined,
        registry: policies
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(record, null, 2) }]
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

server.registerTool(
  "get_verification",
  {
    title: "Get a verification result by id",
    description: "Looks up a verification by its id (e.g. after manual_review or for polling). Returns the record or an error if not found.",
    inputSchema: {
      verificationId: z.string().describe("Verification id returned by verify_claim")
    }
  },
  async (args) => {
    const record = getVerification(args.verificationId);
    return {
      content: [
        {
          type: "text" as const,
          text: record
            ? JSON.stringify(record, null, 2)
            : JSON.stringify({ error: `verification ${args.verificationId} not found` }, null, 2)
        }
      ]
    };
  }
);

server.registerTool(
  "list_policies",
  {
    title: "List available verification policies",
    description: "Lists all claim types the engine supports, with assurance level, claim description, and required evidence dimensions.",
    inputSchema: {}
  },
  async () => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(listPolicies(policies), null, 2) }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
