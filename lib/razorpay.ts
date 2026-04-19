import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createSubscription() {
  return await razorpay.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID!,
    total_count: 120,
    quantity: 1,
  });
}
