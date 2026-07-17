import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export async function sendSms(to: string, message: string) {
  if (!client || !twilioNumber) {
    console.log(`[SMS MOCK] To: ${to}, Message: ${message}`);
    return;
  }

  try {
    const res = await client.messages.create({
      body: message,
      from: twilioNumber,
      to,
    });
    console.log(`[SMS SUCCESS] Sent to ${to}, SID: ${res.sid}`);
  } catch (error: any) {
    console.error(`[SMS FAILED] To: ${to}, Error: ${error.message}`);
  }
}

export async function sendWinAlert(to: string, amount: string) {
  const message = `🎉 WINNER! Your trade was successful. ₹${amount} has been credited to your wallet. Keep trading to grow your wealth! - HTC Trade`;
  await sendSms(to, message);
}
