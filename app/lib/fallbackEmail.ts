type SendFallbackEmailsInput = {
  emails: string[];
  orderId: string;
  serviceSummary: string;
  location: string;
  budget: string;
  deadline: string;
};

type SendFallbackEmailsResult = {
  provider: "resend" | "mock";
  attempted: boolean;
  sent: number;
  failed: number;
  errors: string[];
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function buildText(input: SendFallbackEmailsInput) {
  return [
    "New AI2Human fallback order available.",
    "",
    `Order: ${input.orderId}`,
    `Summary: ${input.serviceSummary}`,
    `Location: ${input.location}`,
    `Budget: ${input.budget}`,
    `Deadline: ${input.deadline}`,
    "",
    "Open AI2Human app to accept the order."
  ].join("\n");
}

export async function sendFallbackAlertEmails(
  input: SendFallbackEmailsInput
): Promise<SendFallbackEmailsResult> {
  if (input.emails.length === 0) {
    return {
      provider: "mock",
      attempted: false,
      sent: 0,
      failed: 0,
      errors: []
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY || "";
  const fromAddress = process.env.FALLBACK_ALERT_FROM_EMAIL || "AI2Human <noreply@ai2human.work>";

  if (!resendApiKey) {
    return {
      provider: "mock",
      attempted: false,
      sent: input.emails.length,
      failed: 0,
      errors: []
    };
  }

  const text = buildText(input);
  const subject = `New fallback order in ${input.location} (${input.budget})`;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const to of input.emails) {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to,
          subject,
          text
        })
      });

      if (!response.ok) {
        failed += 1;
        errors.push(`${to}: ${response.status}`);
        continue;
      }

      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push(`${to}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  return {
    provider: "resend",
    attempted: true,
    sent,
    failed,
    errors
  };
}
